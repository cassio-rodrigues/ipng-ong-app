from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book_loan import BookLoan
from app.domains.loans.schemas import LoanCreate, LoanReturn


async def list_loans(
    db: AsyncSession,
    student_id: uuid.UUID | None = None,
    book_id: uuid.UUID | None = None,
    status: str | None = None,
) -> list[BookLoan]:
    q = select(BookLoan).order_by(BookLoan.borrowed_at.desc())
    if student_id:
        q = q.where(BookLoan.student_id == student_id)
    if book_id:
        q = q.where(BookLoan.book_id == book_id)
    if status:
        q = q.where(BookLoan.status == status)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_loan(db: AsyncSession, payload: LoanCreate) -> BookLoan:
    loan = BookLoan(
        student_id=payload.student_id,
        book_id=payload.book_id,
        due_date=payload.due_date,
        notes=payload.notes,
        status="active",
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


async def return_loan(db: AsyncSession, loan_id: uuid.UUID, payload: LoanReturn) -> BookLoan | None:
    result = await db.execute(select(BookLoan).where(BookLoan.id == loan_id))
    loan = result.scalar_one_or_none()
    if not loan:
        return None
    loan.returned_at = datetime.now(timezone.utc)
    loan.status = "returned"
    if payload.notes:
        loan.notes = payload.notes
    await db.commit()
    await db.refresh(loan)
    return loan
