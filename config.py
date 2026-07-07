from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{DATA_DIR / 'sobha.db'}"
    jwt_secret: str = "sobha-local-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 12
    admin_username: str = "admin"
    admin_password: str = "Sobha@Admin2026"
    viewer_username: str = "viewer"
    viewer_password: str = "Sobha@Viewer2026"
    seed_payload_path: str = str(PROJECT_ROOT / "extracted" / "seed_payload.json")
    seed_team_mapping_path: str = str(PROJECT_ROOT / "extracted" / "seed_team_mapping.json")
    
    # ===== MICROSOFT SSO SETTINGS =====
    microsoft_client_id: str = "23af7e65-e25b-4b0f-899b-454d22805765"
    microsoft_tenant_id: str = "48affa70-828c-4a3a-8c85-381663b7463b"
    microsoft_client_secret: str = "wnr8Q~wsa4vxeagbtrowyK5ZLqFiMAsIcEKsAdll"
    microsoft_redirect_uri: str = "http://127.0.0.1:8000/api/v1/auth/microsoft/callback"
    
    # SSO Feature Flags
    sso_enabled: bool = True
    sso_default_role: str = "viewer"
    sso_default_scope_type: str = "branch"
    sso_default_scope_value: str = "default"
    sso_auto_create_users: bool = True
    sso_sync_user_info_on_login: bool = True
    # Comma-separated Microsoft emails always granted admin on SSO login
    sso_static_admin_emails: str = (
        "shivanshu.choudhary@sobharealty.com,manan.jain@sobharealty.com"
    )

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        env_file_encoding = "utf-8"


settings = Settings()


def static_sso_admin_emails() -> set[str]:
    return {e.strip().lower() for e in settings.sso_static_admin_emails.split(",") if e.strip()}


def is_static_sso_admin(email: Optional[str]) -> bool:
    if not email:
        return False
    return email.strip().lower() in static_sso_admin_emails()
