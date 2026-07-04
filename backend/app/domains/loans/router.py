from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user, get_db
from app.domains.loans import service
from app.domains.loans.schemas import LoanCreate, LoanResponse, LoanReturn

router = APIRouter(prefix="/loans", tags=["loans"])


@router.get("", response_model=list[LoanResponse])
async def get_loans(
    student_id: uuid.UUID | None = None,
    book_id: uuid.UUID | None = None,
    status: str | None = None,
    db=Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.list_loans(db, student_id=student_id, book_id=book_id, status=status)


@router.post("", response_model=LoanResponse)
async def create_loan(
    body: LoanCreate,
    db=Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.create_loan(db, body)


@router.patch("/{loan_id}/return", response_model=LoanResponse)
async def return_loan(
    loan_id: uuid.UUID,
    body: LoanReturn = LoanReturn(),
    db=Depends(get_db),
    _=Depends(get_current_user),
):
    loan = await service.return_loan(db, loan_id, body)
    if not loan:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return loan
