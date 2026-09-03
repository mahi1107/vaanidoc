import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "VaaniDoc"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api"
    TIMEZONE: str = "Asia/Kolkata"
    
    # Database (Defaults to SQLite in local dev, PostgreSQL in Docker/Production)
    DATABASE_URL: str = "sqlite:///./vaanidoc.db"
    
    # Authentication & Security
    JWT_SECRET_KEY: str = "vaanidoc-super-secret-jwt-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "vaanidoc2026"
    CORS_ORIGINS: str = "*"
    REQUIRE_AUTH_FOR_ANALYTICS: bool = False  # Set true for strictly gated production dashboard
    
    # AI Providers (options: mock, indic, huggingface, openai)
    ASR_PROVIDER: str = "indic"
    NLP_PROVIDER: str = "indic"
    TTS_PROVIDER: str = "indic"
    
    # Cloud AI Keys (optional hosted inference)
    HUGGINGFACE_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    
    # Telephony & Messaging (options: mock, exotel, twilio)
    IVR_PROVIDER: str = "mock"
    SMS_PROVIDER: str = "mock"
    
    # Exotel Settings
    EXOTEL_ACCOUNT_SID: Optional[str] = None
    EXOTEL_API_KEY: Optional[str] = None
    EXOTEL_API_TOKEN: Optional[str] = None
    EXOTEL_PHONE_NUMBER: Optional[str] = None
    EXOTEL_SUBDOMAIN: str = "api.exotel.com"
    EXOTEL_WEBHOOK_SECRET: Optional[str] = None
    
    # Twilio Settings
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_WEBHOOK_SECRET: Optional[str] = None
    
    # Clinical Safety & Emergency
    DEFAULT_LANGUAGE: str = "hi"
    SUPPORTED_LANGUAGES: List[str] = [
        "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "or", "pa", "as", "ur"
    ]
    EMERGENCY_PHONE_NUMBER: str = "108"
    AMBULANCE_PHONE_NUMBER: str = "102"
    ASHA_HELP_DESK_NUMBER: str = "104"
    
    # Audio & Privacy Retention
    AUDIO_RETENTION_DAYS: int = 7
    ENABLE_AUDIO_STORAGE: bool = False
    ANONYMIZE_ANALYTICS: bool = True
    
    # Confidence thresholds
    ASR_CONFIDENCE_THRESHOLD: float = 0.65
    TRIAGE_UNCERTAINTY_THRESHOLD: float = 0.50

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
