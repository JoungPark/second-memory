"""Smoke test: embed text and store vector for a real entry row."""

from __future__ import annotations

import os
import sys
import uuid

import psycopg

from worker_embeddings.embedding import embed_text
from worker_embeddings.store import store_embedding


def create_test_entry(connection: psycopg.Connection) -> str:
    tenant_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    entry_id = str(uuid.uuid4())

    with connection.cursor() as cursor:
        cursor.execute(
            "INSERT INTO tenants (id, name) VALUES (%s, %s)",
            (tenant_id, "smoke-test"),
        )
        cursor.execute(
            """
            INSERT INTO users (id, tenant_id, firebase_uid)
            VALUES (%s, %s, %s)
            """,
            (user_id, tenant_id, f"smoke-{user_id}"),
        )
        cursor.execute(
            """
            INSERT INTO entries (
              id, tenant_id, user_id, entry_type, content, occurred_at
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (entry_id, tenant_id, user_id, "note", "Smoke test memory content"),
        )
    connection.commit()
    return entry_id


def main() -> int:
    text = "Smoke test memory content"
    vector, model = embed_text(text)

    if len(vector) == 0:
        print("FAIL: embedding vector was empty")
        return 1

    print(f"OK: embedded with {model}, dims={len(vector)}")

    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://second_memory:second_memory_dev@localhost:5432/second_memory",
    )

    try:
        with psycopg.connect(database_url, connect_timeout=3) as connection:
            entry_id = create_test_entry(connection)
            store_embedding(entry_id, vector, model)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT model, vector_dims(embedding)
                    FROM entry_embeddings
                    WHERE entry_id = %s
                    """,
                    (entry_id,),
                )
                row = cursor.fetchone()
    except Exception as error:
        print(f"FAIL: {error}")
        return 1

    if not row:
        print("FAIL: embedding row not found")
        return 1

    stored_model, dims = row
    print(f"OK: stored embedding for entry {entry_id} (model={stored_model}, dims={dims})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
