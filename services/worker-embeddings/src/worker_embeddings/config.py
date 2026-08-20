"""Configuration for worker-embeddings."""

from pydantic_settings import BaseSettings, SettingsConfigDict

# Keep queue/job names in sync with packages/shared-types/src/index.ts
EMBEDDING_QUEUE_NAME = "embedding-jobs"
EMBEDDING_JOB_NAME = "embed-entry"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    database_url: str = (
        "postgresql://second_memory:second_memory_dev@localhost:5432/second_memory"
    )
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_http_host: str = "0.0.0.0"
    embedding_http_port: int = 8090
    worker_concurrency: int = 5


settings = Settings()
