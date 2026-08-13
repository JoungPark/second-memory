from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from pgvector.psycopg import register_vector

from worker_embeddings.config import settings


@contextmanager
def db_connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(settings.database_url) as connection:
        register_vector(connection)
        yield connection


def store_embedding(entry_id: str, vector: list[float], model: str) -> None:
    with db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO entry_embeddings (entry_id, embedding, model, embedded_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (entry_id)
                DO UPDATE SET
                  embedding = EXCLUDED.embedding,
                  model = EXCLUDED.model,
                  embedded_at = EXCLUDED.embedded_at
                """,
                (entry_id, vector, model),
            )
        connection.commit()
