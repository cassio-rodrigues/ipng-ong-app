"""Envio de email via SMTP (qualquer provedor: Hostinger, Gmail com senha de app, Brevo…).
Sem SMTP_HOST configurado, o envio fica desligado e as telas orientam a procurar a coordenação."""
from __future__ import annotations

import asyncio
import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger(__name__)


def email_enabled() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_FROM)


def _send(to: str, subject: str, text: str, html: str | None) -> None:
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    context = ssl.create_default_context()
    if settings.SMTP_SECURITY == "ssl":
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=20)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        if settings.SMTP_SECURITY == "starttls":
            server.starttls(context=context)
    with server:
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)


async def send_email(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Envia sem travar o servidor. Falha de envio é registrada no log, sem o conteúdo."""
    if not email_enabled():
        return False
    try:
        await asyncio.to_thread(_send, to, subject, text, html)
        return True
    except Exception as e:  # noqa: BLE001 — qualquer falha de SMTP não pode derrubar a requisição
        log.error("Falha ao enviar email (%s): %s", subject, type(e).__name__)
        return False
