from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
qdrant = QdrantClient(":memory:")  # in-memory for development

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