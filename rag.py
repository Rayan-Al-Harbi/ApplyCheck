import os

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
USE_MEMORY = os.getenv("QDRANT_MEMORY", "false").lower() == "true"

if USE_MEMORY:
    qdrant = QdrantClient(":memory:")
else:
    qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

COLLECTION_NAME = "cv_chunks"
EMBEDDING_DIM = 384    


def get_embedding(text: str) -> list[float]:
    return embedding_model.encode(text).tolist()


def store_cv_chunks(chunks: list[str]):
    if not qdrant.collection_exists(COLLECTION_NAME):
        qdrant.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=EMBEDDING_DIM,
                distance=Distance.COSINE,
            ),
        )

    points = [
        PointStruct(
            id=i,
            vector=get_embedding(chunk),
            payload={"text": chunk},
        )
        for i, chunk in enumerate(chunks)
    ]

    qdrant.upsert(collection_name=COLLECTION_NAME, points=points)


def retrieve_relevant_chunks(query: str, top_k: int = 3) -> list[dict]:
    query_vector = get_embedding(query)

    results = qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=top_k,
    ).points

    return [
        {"text": hit.payload["text"], "score": hit.score}
        for hit in results
    ]


TOKEN_THRESHOLD = 200


def keyword_search(skill: str) -> list[str]:
    all_chunks = qdrant.scroll(
        collection_name=COLLECTION_NAME,
        limit=100,
        with_payload=True,
    )[0]
    return [p.payload["text"] for p in all_chunks if skill.lower() in p.payload["text"].lower()]


def get_cv_context(cv_text: str, skill: str, chunks_stored: bool) -> str:
    if len(cv_text.split()) < TOKEN_THRESHOLD:
        return cv_text  # short CV, just use the whole thing

    keyword_matches = keyword_search(skill)
    semantic_chunks = [c["text"] for c in retrieve_relevant_chunks(query=skill, top_k=3)]

    # merge, keeping keyword matches first, deduplicating by content
    seen = set()
    merged = []
    for chunk in keyword_matches + semantic_chunks:
        if chunk not in seen:
            seen.add(chunk)
            merged.append(chunk)

    return "\n".join(merged)