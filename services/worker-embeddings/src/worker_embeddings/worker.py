from __future__ import annotations

import asyncio
import logging
from typing import Any

from bullmq import Worker

from worker_embeddings.config import EMBEDDING_JOB_NAME, EMBEDDING_QUEUE_NAME, settings
from worker_embeddings.embedding import embed_text
from worker_embeddings.store import store_embedding

logger = logging.getLogger(__name__)


async def process_job(job: Any, _job_token: str | None) -> None:
    if job.name != EMBEDDING_JOB_NAME:
        raise ValueError(f"Unsupported job name: {job.name}")

    data = job.data
    entry_id = data["entryId"]
    content = data["content"]

    vector, model = embed_text(content)
    try:
        store_embedding(entry_id, vector, model)
        logger.info("Stored embedding for entry %s using %s", entry_id, model)
    except Exception as e:
        logger.error("Error storing embedding for entry %s: %s", entry_id, e)
        raise e


async def run_worker(shutdown_event: asyncio.Event) -> None:
    worker = Worker(
        EMBEDDING_QUEUE_NAME,
        process_job,
        {
            "connection": settings.redis_url,
            "concurrency": settings.worker_concurrency,
        },
    )

    logger.info("Listening on queue %s", EMBEDDING_QUEUE_NAME)
    await shutdown_event.wait()

    logger.info("Shutting down worker")
    await worker.close()
    logger.info("Worker stopped")
