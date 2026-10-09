from __future__ import annotations

import json
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://ipng_user:ipng_pass@db:5432/ipng_db"
    SECRET_KEY: str = "change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEBUG: bool = False
    # Endereço público do frontend, usado nos links enviados por email
    APP_URL: str = "http://localhost:3001"
    # Email (recuperação de senha). Vazio = envio desligado
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""  # ex.: "IPNG <nao-responda@inglesparanossagente.org>"
    SMTP_SECURITY: str = "starttls"  # starttls (porta 587) | ssl (porta 465) | none
    PASSWORD_RESET_MINUTES: int = 30
    # Versão do termo de uso/privacidade vigente, gravada junto com cada aceite
    TERMS_VERSION: str = "2026-10"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [o.strip() for o in v.split(",") if o.strip()]
        return v


WEAK_SECRETS = {"change-me", "change-me-in-production-use-openssl-rand-hex-32"}

settings = Settings()

# Com a chave padrão, qualquer um forja um login de admin e lê todos os dados pessoais.
# Em produção (DEBUG=false) o backend se recusa a subir assim.
if not settings.DEBUG and (settings.SECRET_KEY in WEAK_SECRETS or len(settings.SECRET_KEY) < 32):
    raise RuntimeError("SECRET_KEY fraca ou padrão. Gere uma com: openssl rand -hex 32")
