from worker_embeddings.config import (
    EMBEDDING_JOB_NAME,
    EMBEDDING_QUEUE_NAME,
)


def test_queue_constants_match_shared_types_contract() -> None:
    assert EMBEDDING_QUEUE_NAME == "embedding-jobs"
    assert EMBEDDING_JOB_NAME == "embed-entry"
