from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    
    # AI/LLM Configuration
    mistral_api: Optional[str] = None

    class Config:
        env_file = ".env"
     

settings = Settings()
