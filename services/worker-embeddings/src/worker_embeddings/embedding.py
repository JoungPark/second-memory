from __future__ import annotations

from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

from worker_embeddings.config import settings


class EmbeddingError(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


def embed_text(text: str) -> tuple[list[float], str]:
    model = _load_model()
    vector = model.encode(text, normalize_embeddings=True)
    array = np.asarray(vector, dtype=np.float32)

    if array.ndim != 1 or array.shape[0] == 0:
        raise ValueError(
            f"Model {settings.embedding_model} produced an invalid embedding shape: {array.shape}"
        )

    return array.tolist(), settings.embedding_model
