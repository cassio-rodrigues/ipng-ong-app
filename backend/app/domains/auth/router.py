from __future__ import annotations

import uuid
from html import escape

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import current_user_id
from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.email import email_enabled, send_email
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_token,
    hash_password,
    password_fingerprint,
    verify_password,
)
from app.domains.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
)
from app.domains.auth.service import authenticate, build_tokens
from app.domains.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate(db, body.email, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    return build_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    from app.models.user import User

    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token inválido")

    user_id = uuid.UUID(payload["sub"])
    user = await db.get(User, user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    if payload.get("ver", 0) != (user.token_version or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessão encerrada. Entre novamente")

    return build_tokens(user)


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/change-password", response_model=TokenResponse)
async def change_password(body: ChangePasswordRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    if not verify_password(body.current_password, current_user.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")
    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    # Senha nova derruba as outras sessões; esta recebe tokens novos
    current_user.token_version = (current_user.token_version or 0) + 1
    await db.commit()
    return build_tokens(current_user)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
async def logout_all(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """Encerra todas as sessões do usuário, em qualquer dispositivo (inclusive esta)."""
    current_user.token_version = (current_user.token_version or 0) + 1
    await db.commit()


FORGOT_MESSAGE = "Se o email estiver cadastrado, enviamos um link para redefinir a senha. Confira também a caixa de spam."


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Envia o link de redefinição. A resposta é sempre a mesma, exista ou não a conta."""
    from app.models.user import User

    if not email_enabled():
        return ForgotPasswordResponse(
            detail="A recuperação por email não está disponível. Peça à coordenação para redefinir sua senha.",
            email_enabled=False,
        )
    user = await db.scalar(
        select(User).where(func.lower(User.email) == body.email.lower(), User.status == "active")
    )
    if user:
        token = create_reset_token(str(user.id), user.token_version or 0, user.password_hash)
        link = f"{settings.APP_URL.rstrip('/')}/redefinir-senha?token={token}"
        minutes = settings.PASSWORD_RESET_MINUTES
        name = (user.name or "").split(" ")[0]
        await send_email(
            user.email,
            "Redefinição de senha — Inglês Para Nossa Gente",
            f"Olá, {name}!\n\nRecebemos um pedido para redefinir sua senha no sistema do Inglês Para Nossa Gente.\n"
            f"Abra o link abaixo em até {minutes} minutos:\n\n{link}\n\n"
            "Se não foi você, ignore este email — sua senha continua a mesma.",
            f"""<p>Olá, {escape(name)}!</p>
<p>Recebemos um pedido para redefinir sua senha no sistema do <strong>Inglês Para Nossa Gente</strong>.</p>
<p><a href="{escape(link)}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Redefinir minha senha</a></p>
<p style="color:#666;font-size:13px">O link vale por {minutes} minutos e só pode ser usado uma vez.<br>
Se não foi você, ignore este email — sua senha continua a mesma.</p>""",
        )
    return ForgotPasswordResponse(detail=FORGOT_MESSAGE, email_enabled=True)


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    from app.models.user import User

    invalid = HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Link inválido ou expirado. Peça um novo.")
    payload = decode_token(body.token)
    if not payload or payload.get("type") != "reset":
        raise invalid
    try:
        user = await db.get(User, uuid.UUID(payload["sub"]))
    except (KeyError, ValueError):
        raise invalid
    # Uso único: a senha (e portanto a impressão digital) muda depois do primeiro uso
    if (
        not user or user.status != "active"
        or payload.get("ver", 0) != (user.token_version or 0)
        or payload.get("pwh") != password_fingerprint(user.password_hash)
    ):
        raise invalid

    current_user_id.set(user.id)  # a auditoria registra a redefinição como feita pelo próprio usuário
    user.password_hash = hash_password(body.new_password)
    user.must_change_password = False
    user.token_version = (user.token_version or 0) + 1  # derruba sessões abertas com a senha antiga
    await db.commit()
    return {"detail": "Senha redefinida. Entre com a nova senha."}
