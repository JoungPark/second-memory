from __future__ import annotations

import asyncio
import logging
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from worker_embeddings.config import settings
from worker_embeddings.embedding import EmbeddingError, embed_text

logger = logging.getLogger(__name__)

app = FastAPI(title="worker-embeddings", docs_url=None, redoc_url=None)


class OpenAiError(BaseModel):
    message: str
    type: str
    param: str | None = None
    code: str | None = None


class OpenAiErrorResponse(BaseModel):
    error: OpenAiError


class EmbedRequest(BaseModel):
    text: str = Field(min_length=1)


class EmbedResponse(BaseModel):
    embedding: list[float]


class CreateEmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str = Field(min_length=1)
    encoding_format: Literal["float", "base64"] | None = "float"


class EmbeddingObject(BaseModel):
    object: Literal["embedding"] = "embedding"
    index: int
    embedding: list[float]


class EmbeddingUsage(BaseModel):
    prompt_tokens: int
    total_tokens: int


class CreateEmbeddingResponse(BaseModel):
    object: Literal["list"] = "list"
    data: list[EmbeddingObject]
    model: str
    usage: EmbeddingUsage


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def openai_error_response(
    status_code: int,
    message: str,
    error_type: str,
    *,
    param: str | None = None,
    code: str | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=OpenAiErrorResponse(
            error=OpenAiError(
                message=message,
                type=error_type,
                param=param,
                code=code,
            )
        ).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    message = "; ".join(
        f"{'.'.join(str(part) for part in error.get('loc', []))}: {error.get('msg', 'invalid value')}"
        for error in exc.errors()
    )
    return openai_error_response(422, message, "invalid_request_error")


async def embed_inputs(inputs: list[str]) -> list[list[float]]:
    vectors: list[list[float]] = []

    for text in inputs:
        vector, _model = await asyncio.to_thread(embed_text, text)
        vectors.append(vector)

    return vectors


@app.post("/v1/embeddings", response_model=CreateEmbeddingResponse)
async def create_embeddings(payload: CreateEmbeddingRequest) -> CreateEmbeddingResponse | JSONResponse:
    if payload.encoding_format == "base64":
        return openai_error_response(
            400,
            "encoding_format 'base64' is not supported",
            "invalid_request_error",
            param="encoding_format",
        )

    inputs = [payload.input] if isinstance(payload.input, str) else payload.input

    if not inputs or any(not text.strip() for text in inputs):
        return openai_error_response(
            422,
            "input must contain at least one non-empty string",
            "invalid_request_error",
            param="input",
        )

    try:
        vectors = await embed_inputs(inputs)
    except ValueError as error:
        return openai_error_response(500, str(error), "server_error")
    except EmbeddingError as error:
        return openai_error_response(503, str(error), "server_error")

    prompt_tokens = sum(estimate_tokens(text) for text in inputs)

    return CreateEmbeddingResponse(
        data=[
            EmbeddingObject(index=index, embedding=vector)
            for index, vector in enumerate(vectors)
        ],
        model=settings.embedding_model,
        usage=EmbeddingUsage(
            prompt_tokens=prompt_tokens,
            total_tokens=prompt_tokens,
        ),
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(payload: EmbedRequest) -> EmbedResponse:
    try:
        vectors = await embed_inputs([payload.text])
    except ValueError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    except EmbeddingError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return EmbedResponse(embedding=vectors[0])


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
