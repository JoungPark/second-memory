"""Configuration mirrored from packages/shared-types/src/index.ts."""

from pydantic_settings import BaseSettings, SettingsConfigDict

# Keep in sync with @second-memory/shared-types
EMBEDDING_QUEUE_NAME = "embedding-jobs"
EMBEDDING_JOB_NAME = "embed-entry"
EMBEDDING_DIMENSIONS = 384


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    redis_url: str = "redis://localhost:6379"
    database_url: str = (
        "postgresql://second_memory:second_memory_dev@localhost:5432/second_memory"
    )
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    worker_concurrency: int = 5


settings = Settings()
