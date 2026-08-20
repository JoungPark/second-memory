from __future__ import annotations

import asyncio
import logging
import signal
import sys

from worker_embeddings.http_server import run_http_server
from worker_embeddings.worker import run_worker

logger = logging.getLogger(__name__)


async def run() -> None:
    shutdown_event = asyncio.Event()

    def signal_handler(_signum: int, _frame: object) -> None:
        logger.info("Shutdown signal received")
        shutdown_event.set()

    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)

    await asyncio.gather(
        run_worker(shutdown_event),
        run_http_server(shutdown_event),
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="[worker-embeddings] %(levelname)s %(message)s",
    )

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    main()
