from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    
    # AI/LLM Configuration - supports both MISTRAL_API_KEY and MISTRAL_API
    mistral_api_key: Optional[str] = None
    mistral_api: Optional[str] = None

    # Email (SMTP) Configuration
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_password: str
    email_from: str

    class Config:
        env_file = ".env"
     

settings = Settings()
