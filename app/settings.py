from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    # Rutas de datos y clave API (existentes)
    INGREDIENTES_CSV: str
    PLATOS_CSV: str
    GENAI_API_KEY: str
    MONGO_URI: str | None = None

    # --- Nuevas configuraciones para adaptar la lógica del test ---
    CLUSTERS: int = 4                           # Número de clusters para KMeans
    PROTOTIPOS_MIN: int = 3                    # Mínimo ingredientes a muestrear
    PROTOTIPOS_MAX: int = 7                    # Máximo ingredientes a muestrear
    GEMINI_MAX_RETRIES: int = 5                 # Reintentos al llamar a Gemini
    DEFAULT_DISHES_COUNT: int = 3              # Número por defecto de platos a generar
    TARGET_CARBOHYDRATES: tuple[int, int] = (50, 60)  # % energía de carbohidratos
    TARGET_PROTEINS: tuple[int, int]     = (10, 15)  # % energía de proteínas
    TARGET_FATS: tuple[int, int]         = (20, 30)  # % energía de grasas

    model_config = ConfigDict(
        env_file = ".env",
        env_file_encoding = "utf-8"
    )

settings = Settings()
