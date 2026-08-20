from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from worker_embeddings.config import Settings
from worker_embeddings.embedding import (
    _load_model,
    embed_text,
)


@pytest.fixture(autouse=True)
def clear_model_cache() -> None:
    _load_model.cache_clear()
    yield
    _load_model.cache_clear()


def test_embed_text_returns_normalized_vector() -> None:
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([3.0, 4.0], dtype=np.float32)

    with patch("worker_embeddings.embedding.settings") as mock_settings:
        mock_settings.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"
        with patch("worker_embeddings.embedding._load_model", return_value=mock_model):
            vector, model = embed_text("hello")

    mock_model.encode.assert_called_once_with("hello", normalize_embeddings=True)
    assert model == "sentence-transformers/all-MiniLM-L6-v2"
    assert vector == pytest.approx([3.0, 4.0])


def test_embed_text_rejects_empty_vector() -> None:
    mock_model = MagicMock()
    mock_model.encode.return_value = np.array([], dtype=np.float32)

    with patch("worker_embeddings.embedding._load_model", return_value=mock_model):
        with pytest.raises(ValueError, match="invalid embedding shape"):
            embed_text("hello")


def test_load_model_is_cached() -> None:
    with patch("worker_embeddings.embedding.SentenceTransformer") as mock_sentence_transformer:
        mock_sentence_transformer.return_value = MagicMock()
        first = _load_model()
        second = _load_model()

    assert first is second
    mock_sentence_transformer.assert_called_once()


def test_settings_defaults() -> None:
    settings = Settings(_env_file=None)
    assert settings.embedding_model == "sentence-transformers/all-MiniLM-L6-v2"
    assert settings.embedding_http_host == "0.0.0.0"
    assert settings.embedding_http_port == 8090
