from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from worker_embeddings.config import settings
from worker_embeddings.embedding import EmbeddingError, embed_text

logger = logging.getLogger(__name__)

app = FastAPI(title="worker-embeddings", docs_url=None, redoc_url=None)


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class EmbedResponse(BaseModel):
    embedding: list[float]


@app.post("/embed", response_model=EmbedResponse)
async def embed(payload: EmbedRequest) -> EmbedResponse:
    try:
        vector, _model = await asyncio.to_thread(embed_text, payload.text)
    except ValueError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return EmbedResponse(embedding=vector)


async def run_http_server(shutdown_event: asyncio.Event) -> None:
    import uvicorn

    config = uvicorn.Config(
        app,
        host=settings.embedding_http_host,
        port=settings.embedding_http_port,
        log_level="info",
    )
    server = uvicorn.Server(config)
    server.install_signal_handlers = lambda: None

    serve_task = asyncio.create_task(server.serve())
    await shutdown_event.wait()

    logger.info("Shutting down embedding HTTP server")
    server.should_exit = True
    await serve_task
    logger.info("Embedding HTTP server stopped")
