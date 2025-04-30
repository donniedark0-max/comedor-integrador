from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    INGREDIENTES_CSV: str
    PLATOS_CSV: str
    GENAI_API_KEY: str
    MONGO_URI: str | None = None

    model_config = ConfigDict(
        env_file = ".env",
        env_file_encoding = "utf-8"
    )

settings = Settings()
