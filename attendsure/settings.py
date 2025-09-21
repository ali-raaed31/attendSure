import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass
class Settings:
    vapi_api_key: str = os.getenv("VAPI_API_KEY", "")
    vapi_assistant_id: str = os.getenv("VAPI_ASSISTANT_ID", "")
    vapi_phone_number_id: str = os.getenv("VAPI_PHONE_NUMBER_ID", "")
    base_url: str = os.getenv("BASE_URL", "http://localhost:8000")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./attendsure.db")
    frontend_origin: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
    webhook_secret: str = os.getenv("WEBHOOK_SECRET", "")
    concurrency_limit: int = int(os.getenv("CONCURRENCY_LIMIT", "2"))
    environment: str = os.getenv("ENVIRONMENT", "development")
    use_vapi_scheduler: bool = os.getenv("USE_VAPI_SCHEDULER", "true").lower() in ["1", "true", "yes"]


settings = Settings()


