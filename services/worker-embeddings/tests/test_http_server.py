from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from worker_embeddings.http_server import app


def test_embed_returns_vector() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        return_value=([0.6, 0.8], "sentence-transformers/all-MiniLM-L6-v2"),
    ):
        response = client.post("/embed", json={"text": "hello"})

    assert response.status_code == 200
    assert response.json() == {"embedding": [0.6, 0.8]}


def test_embed_rejects_empty_text() -> None:
    client = TestClient(app)

    response = client.post("/embed", json={"text": ""})

    assert response.status_code == 422


def test_embed_maps_value_error_to_500() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        side_effect=ValueError("dimension mismatch"),
    ):
        response = client.post("/embed", json={"text": "hello"})

    assert response.status_code == 500
    assert response.json()["detail"] == "dimension mismatch"
