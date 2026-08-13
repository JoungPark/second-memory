from __future__ import annotations

import asyncio
import logging
import signal
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
    store_embedding(entry_id, vector, model)
    logger.info("Stored embedding for entry %s using %s", entry_id, model)


async def run_worker() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[EmbeddingWorker] %(levelname)s %(message)s",
    )

    shutdown_event = asyncio.Event()

    def signal_handler(_signum: int, _frame: Any) -> None:
        logger.info("Shutdown signal received")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

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
