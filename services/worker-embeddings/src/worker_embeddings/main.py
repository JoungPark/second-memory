from __future__ import annotations

import asyncio
import sys

from worker_embeddings.worker import run_worker


def run() -> None:
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        sys.exit(0)


if __name__ == "__main__":
    run()
