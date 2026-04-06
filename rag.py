import os
import threading
from collections import OrderedDict

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from sentence_transformers import SentenceTransformer

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
USE_MEMORY = os.getenv("QDRANT_MEMORY", "false").lower() == "true"

if QDRANT_URL:
    qdrant = QdrantClient(url=QDRANT_URL)
elif USE_MEMORY:
    qdrant = QdrantClient(":memory:")
else:
    qdrant = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)

EMBEDDING_DIM = 384
TOKEN_THRESHOLD = 200

# Thread-safe bounded embedding cache
_embedding_cache: OrderedDict[str, list[float]] = OrderedDict()
_cache_lock = threading.Lock()
_CACHE_MAX_SIZE = 2000


def get_embedding(text: str) -> list[float]:
    with _cache_lock:
        if text in _embedding_cache:
            _embedding_cache.move_to_end(text)
            return _embedding_cache[text]

    vec = embedding_model.encode(text).tolist()

    with _cache_lock:
        _embedding_cache[text] = vec
        while len(_embedding_cache) > _CACHE_MAX_SIZE:
            _embedding_cache.popitem(last=False)
    return vec


def batch_embed(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in a single model call."""
    with _cache_lock:
        uncached = [t for t in texts if t not in _embedding_cache]

    if uncached:
        vectors = embedding_model.encode(uncached).tolist()
        with _cache_lock:
            for t, v in zip(uncached, vectors):
                _embedding_cache[t] = v
            while len(_embedding_cache) > _CACHE_MAX_SIZE:
                _embedding_cache.popitem(last=False)

    with _cache_lock:
        return [_embedding_cache[t] for t in texts]


def precompute_skill_embeddings(skills: list[str]):
    """Pre-embed all skills in a single batch call before the per-skill loop."""
    batch_embed(skills)


def _collection_name(trace_id: str) -> str:
    """Each request gets its own isolated Qdrant collection."""
    return f"cv_{trace_id.replace('-', '_')}"


def store_cv_chunks(chunks: list[str], trace_id: str):
    collection = _collection_name(trace_id)

    if qdrant.collection_exists(collection):
        qdrant.delete_collection(collection)

    qdrant.create_collection(
        collection_name=collection,
        vectors_config=VectorParams(
            size=EMBEDDING_DIM,
            distance=Distance.COSINE,
        ),
    )

    vectors = batch_embed(chunks)
    points = [
        PointStruct(id=i, vector=vec, payload={"text": chunk})
        for i, (chunk, vec) in enumerate(zip(chunks, vectors))
    ]

    qdrant.upsert(collection_name=collection, points=points)


def cleanup_collection(trace_id: str):
    """Delete the per-request collection after analysis is done."""
    collection = _collection_name(trace_id)
    try:
        if qdrant.collection_exists(collection):
            qdrant.delete_collection(collection)
    except Exception:
        pass  # best-effort cleanup


def retrieve_relevant_chunks(query: str, trace_id: str, top_k: int = 3) -> list[dict]:
    collection = _collection_name(trace_id)
    query_vector = get_embedding(query)

    results = qdrant.query_points(
        collection_name=collection,
        query=query_vector,
        limit=top_k,
    ).points

    return [
        {"text": hit.payload["text"], "score": hit.score}
        for hit in results
    ]


def keyword_search(skill: str, trace_id: str) -> list[str]:
    collection = _collection_name(trace_id)
    all_chunks = qdrant.scroll(
        collection_name=collection,
        limit=100,
        with_payload=True,
    )[0]
    return [p.payload["text"] for p in all_chunks if skill.lower() in p.payload["text"].lower()]


def get_cv_context(cv_text: str, skill: str, chunks_stored: bool, trace_id: str) -> str:
    if len(cv_text.split()) < TOKEN_THRESHOLD:
        return cv_text

    keyword_matches = keyword_search(skill, trace_id)
    semantic_chunks = [c["text"] for c in retrieve_relevant_chunks(query=skill, trace_id=trace_id, top_k=3)]

    seen = set()
    merged = []
    for chunk in keyword_matches + semantic_chunks:
        if chunk not in seen:
            seen.add(chunk)
            merged.append(chunk)

    return "\n".join(merged)
