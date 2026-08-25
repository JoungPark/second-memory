from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from worker_embeddings.embedding import EmbeddingError
from worker_embeddings.http_server import app


def test_create_embeddings_returns_openai_shape() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        return_value=([0.6, 0.8], "sentence-transformers/all-MiniLM-L6-v2"),
    ):
        response = client.post(
            "/v1/embeddings",
            json={
                "input": "hello",
                "model": "sentence-transformers/all-MiniLM-L6-v2",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["object"] == "list"
    assert payload["model"] == "sentence-transformers/all-MiniLM-L6-v2"
    assert payload["data"] == [
        {
            "object": "embedding",
            "index": 0,
            "embedding": [0.6, 0.8],
        }
    ]
    assert payload["usage"]["prompt_tokens"] == 1
    assert payload["usage"]["total_tokens"] == 1


def test_create_embeddings_supports_batch_input() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        side_effect=[
            ([0.6, 0.8], "sentence-transformers/all-MiniLM-L6-v2"),
            ([0.0, 1.0], "sentence-transformers/all-MiniLM-L6-v2"),
        ],
    ):
        response = client.post(
            "/v1/embeddings",
            json={
                "input": ["hello", "world"],
                "model": "sentence-transformers/all-MiniLM-L6-v2",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert len(payload["data"]) == 2
    assert payload["data"][0]["index"] == 0
    assert payload["data"][1]["index"] == 1
    assert payload["data"][0]["embedding"] == [0.6, 0.8]
    assert payload["data"][1]["embedding"] == [0.0, 1.0]


def test_create_embeddings_rejects_missing_model() -> None:
    client = TestClient(app)

    response = client.post("/v1/embeddings", json={"input": "hello"})

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["type"] == "invalid_request_error"


def test_create_embeddings_rejects_empty_input() -> None:
    client = TestClient(app)

    response = client.post(
        "/v1/embeddings",
        json={"input": "", "model": "sentence-transformers/all-MiniLM-L6-v2"},
    )

    assert response.status_code == 422
    payload = response.json()
    assert payload["error"]["type"] == "invalid_request_error"


def test_create_embeddings_rejects_base64_encoding() -> None:
    client = TestClient(app)

    response = client.post(
        "/v1/embeddings",
        json={
            "input": "hello",
            "model": "sentence-transformers/all-MiniLM-L6-v2",
            "encoding_format": "base64",
        },
    )

    assert response.status_code == 400
    payload = response.json()
    assert payload["error"]["type"] == "invalid_request_error"
    assert payload["error"]["param"] == "encoding_format"


def test_create_embeddings_maps_value_error_to_openai_500() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        side_effect=ValueError("dimension mismatch"),
    ):
        response = client.post(
            "/v1/embeddings",
            json={
                "input": "hello",
                "model": "sentence-transformers/all-MiniLM-L6-v2",
            },
        )

    assert response.status_code == 500
    payload = response.json()
    assert payload["error"]["message"] == "dimension mismatch"
    assert payload["error"]["type"] == "server_error"


def test_create_embeddings_maps_embedding_error_to_openai_503() -> None:
    client = TestClient(app)

    with patch(
        "worker_embeddings.http_server.embed_text",
        side_effect=EmbeddingError("model unavailable"),
    ):
        response = client.post(
            "/v1/embeddings",
            json={
                "input": "hello",
                "model": "sentence-transformers/all-MiniLM-L6-v2",
            },
        )

    assert response.status_code == 503
    payload = response.json()
    assert payload["error"]["message"] == "model unavailable"
    assert payload["error"]["type"] == "server_error"


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
