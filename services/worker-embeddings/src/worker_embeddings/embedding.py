from __future__ import annotations

from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from worker_embeddings.config import EMBEDDING_DIMENSIONS, settings


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


def embed_text(text: str) -> tuple[list[float], str]:
    model = _load_model()
    vector = model.encode(text, normalize_embeddings=True)
    array = np.asarray(vector, dtype=np.float32)

    if array.shape[0] != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"Model {settings.embedding_model} produced {array.shape[0]} dimensions, "
            f"expected {EMBEDDING_DIMENSIONS}"
        )

    return array.tolist(), settings.embedding_model
