"""Pendências: transforma dados já registrados em itens que pedem ação.

As pendências não são persistidas — são calculadas a cada consulta. O que se
persiste é o acompanhamento (StudentFollowup), que esconde a pendência até que
surja um fato novo (ex.: outra falta) ou o prazo de adiamento acabe.
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import _is_privileged
from app.core.tz import LOCAL_TZ
from app.domains.alerts.schemas import AlertResponse, FollowupCreate, FollowupResponse, LastFollowup
from app.models.activity import StudentHighlight
from app.models.assessment import Assessment, StudentGrade
from app.models.attendance import Attendance
from app.models.book_loan import BookLoan
from app.models.calendar import CalendarEvent
from app.models.class_ import Class_, ClassAssignment
from app.models.followup import StudentFollowup
from app.models.lesson import Lesson, LessonReport
from app.models.student import Enrollment, Student
from app.models.user import User

# Pendência de evasão abaixo de 60% (a interface pinta de vermelho já abaixo de 70% —
# ver frontend/src/lib/attendance.ts), conforme o documento de recomendações.
ATTENDANCE_CRITICAL = 60.0
MIN_RECORDS_FOR_RATE = 4      # abaixo disso a porcentagem ainda não diz muito
ABSENCE_STREAK = 3            # faltas seguidas que disparam o alerta sozinhas
HIGHLIGHT_WINDOW_DAYS = 90    # destaques negativos mais antigos não viram pendência
HOMEWORK_LOOKBACK_DAYS = 7    # próxima aula até 7 dias atrás…
HOMEWORK_LOOKAHEAD_DAYS = 2   # …ou nos próximos 2 dias
HOLIDAY_LOOKAHEAD_DAYS = 14   # aulas agendadas em feriado nas próximas 2 semanas
MISSING_ATTENDANCE_DAYS = 30  # aulas passadas sem presença, olhando 30 dias para trás
LESSON_LENGTH = timedelta(hours=3)  # a aula é considerada encerrada 3h após o início
TEACHER_INACTIVE_DAYS = 14    # voluntário sem lançar presença há 14+ dias
GRADE_WINDOW_DAYS = 90        # notas abaixo do mínimo lançadas nos últimos 90 dias
DEFAULT_MIN_SCORE = 4         # mesmo padrão de Assessment.min_score

# O calendário grava horário local "como se fosse UTC" (ver calendar/page.tsx);
# as aulas guardam o instante real. Para comparar dias, a aula é convertida para LOCAL_TZ.


def _pct(rate: float) -> str:
    return f"{rate:.1f}".rstrip("0").rstrip(".").replace(".", ",") + "%"


async def _visible_class_ids(db: AsyncSession, user) -> set[uuid.UUID] | None:
    """None = sem restrição (admin/coordenação). Professor: turmas em que é principal ou atribuído."""
    if _is_privileged(user):
        return None
    assigned = select(ClassAssignment.class_id).where(ClassAssignment.teacher_id == user.id)
    rows = await db.execute(
        select(Class_.id).where((Class_.main_teacher_id == user.id) | (Class_.id.in_(assigned)))
    )
    return set(rows.scalars().all())


def _in_scope(stmt, column, class_ids: set[uuid.UUID] | None):
    return stmt if class_ids is None else stmt.where(column.in_(class_ids))


async def _attendance_alerts(db: AsyncSession, class_ids) -> list[AlertResponse]:
    stmt = (
        select(
            Attendance.student_id, Attendance.status, Lesson.scheduled_at,
            Lesson.class_id, Student.full_name, Student.phone, Class_.name,
        )
        .join(Lesson, Lesson.id == Attendance.lesson_id)
        .join(Class_, Class_.id == Lesson.class_id)
        .join(Student, Student.id == Attendance.student_id)
        .join(Enrollment, (Enrollment.student_id == Attendance.student_id) & (Enrollment.class_id == Lesson.class_id))
        .where(Enrollment.status == "active", Student.status == "active", Class_.status == "active")
        .order_by(Lesson.scheduled_at)
    )
    rows = (await db.execute(_in_scope(stmt, Lesson.class_id, class_ids))).all()

    grouped: dict[tuple[uuid.UUID, uuid.UUID], list] = defaultdict(list)
    for r in rows:
        grouped[(r.student_id, r.class_id)].append(r)

    alerts = []
    for (student_id, class_id), recs in grouped.items():
        total = len(recs)
        attended = sum(1 for r in recs if r.status in ("present", "late"))
        rate = attended / total * 100
        streak = 0
        for r in reversed(recs):
            if r.status != "absent":
                break
            streak += 1

        low_rate = total >= MIN_RECORDS_FOR_RATE and rate < ATTENDANCE_CRITICAL
        if not (low_rate or streak >= ABSENCE_STREAK):
            continue

        parts = [f"Frequência de {_pct(rate)} ({attended} de {total} aulas)"]
        if streak >= ABSENCE_STREAK:
            parts.append(f"{streak} faltas seguidas")
        last_absence = next((r.scheduled_at for r in reversed(recs) if r.status in ("absent", "justified")), None)
        alerts.append(AlertResponse(
            key=f"attendance_risk:{class_id}:{student_id}",
            type="attendance_risk", severity="high",
            ref_id=class_id, student_id=student_id, student_name=recs[0].full_name,
            student_phone=recs[0].phone, class_id=class_id, class_name=recs[0].name,
            title="Risco de evasão", detail=" · ".join(parts), occurred_at=last_absence,
        ))
    return alerts


async def _highlight_alerts(db: AsyncSession, class_ids, user, now: datetime) -> list[AlertResponse]:
    # Positivos são oportunidades para a coordenação (Day Out, mentoria, intercâmbio)
    types = ["negative"] if class_ids is not None else ["negative", "positive"]
    stmt = select(StudentHighlight).where(
        StudentHighlight.highlight_type.in_(types),
        StudentHighlight.created_at >= now - timedelta(days=HIGHLIGHT_WINDOW_DAYS),
    )
    if class_ids is not None:
        stmt = stmt.where(StudentHighlight.class_id.in_(class_ids) | (StudentHighlight.teacher_id == user.id))
    highlights = (await db.execute(stmt)).scalars().all()

    return [
        AlertResponse(
            key=f"{h.highlight_type}_highlight:{h.id}",
            type=f"{h.highlight_type}_highlight", severity="medium" if h.highlight_type == "negative" else "low",
            ref_id=h.id, student_id=h.student_id,
            student_name=h.student.full_name if h.student else None,
            student_phone=h.student.phone if h.student else None,
            class_id=h.class_id, class_name=h.class_.name if h.class_ else None,
            title="Destaque negativo" if h.highlight_type == "negative" else "Destaque positivo",
            detail=" · ".join(filter(None, [
                h.title or h.description,
                f"registrado por {h.teacher.name}" if h.teacher and h.teacher.name else None,
            ])) or "Sem descrição",
            occurred_at=h.created_at,
        )
        for h in highlights
    ]


async def _homework_alerts(db: AsyncSession, class_ids, now: datetime) -> list[AlertResponse]:
    """Dever passado numa aula vira checagem na aula seguinte da mesma turma."""
    window_start = now - timedelta(days=HOMEWORK_LOOKBACK_DAYS + 30)
    stmt = (
        select(Lesson, LessonReport.homework, Class_.name)
        .join(Class_, Class_.id == Lesson.class_id)
        .outerjoin(LessonReport, LessonReport.lesson_id == Lesson.id)
        .where(
            Lesson.status != "cancelled",
            Lesson.scheduled_at >= window_start,
            Lesson.scheduled_at <= now + timedelta(days=HOMEWORK_LOOKAHEAD_DAYS),
        )
        .order_by(Lesson.class_id, Lesson.scheduled_at)
    )
    rows = (await db.execute(_in_scope(stmt, Lesson.class_id, class_ids))).all()

    # Dever já registrado aluno a aluno na chamada da aula = checagem feita
    checked = set((await db.execute(
        select(Attendance.lesson_id).where(
            Attendance.lesson_id.in_([r.Lesson.id for r in rows]), Attendance.homework_status.is_not(None),
        ).distinct()
    )).scalars().all()) if rows else set()

    by_class: dict[uuid.UUID, list] = defaultdict(list)
    for r in rows:
        by_class[r.Lesson.class_id].append(r)

    alerts = []
    for class_id, lessons in by_class.items():
        for prev, nxt in zip(lessons, lessons[1:]):
            homework = (prev.homework or "").strip()
            if not homework or nxt.Lesson.id in checked or nxt.Lesson.scheduled_at < now - timedelta(days=HOMEWORK_LOOKBACK_DAYS):
                continue
            alerts.append(AlertResponse(
                key=f"homework_check:{nxt.Lesson.id}",
                type="homework_check", severity="medium",
                ref_id=nxt.Lesson.id, class_id=class_id, class_name=nxt.name, lesson_id=nxt.Lesson.id,
                title="Checar dever de casa", detail=homework, occurred_at=nxt.Lesson.scheduled_at,
            ))
    return alerts


def _num(x) -> str:
    return f"{float(x):.1f}".rstrip("0").rstrip(".").replace(".", ",")


async def _grade_alerts(db: AsyncSession, class_ids, now: datetime) -> list[AlertResponse]:
    """Nota abaixo do mínimo da avaliação. Cada nota é uma pendência própria."""
    stmt = (
        select(StudentGrade, Assessment, Student.full_name, Student.phone, Class_.name)
        .join(Assessment, Assessment.id == StudentGrade.assessment_id)
        .join(Student, Student.id == StudentGrade.student_id)
        .outerjoin(Class_, Class_.id == Assessment.class_id)
        .where(
            StudentGrade.score.is_not(None),
            StudentGrade.score < func.coalesce(Assessment.min_score, DEFAULT_MIN_SCORE),
            StudentGrade.created_at >= now - timedelta(days=GRADE_WINDOW_DAYS),
            Student.status == "active",
        )
    )
    rows = (await db.execute(_in_scope(stmt, Assessment.class_id, class_ids))).all()
    return [
        AlertResponse(
            key=f"low_grade:{r.StudentGrade.id}",
            type="low_grade", severity="medium",
            ref_id=r.StudentGrade.id, student_id=r.StudentGrade.student_id,
            student_name=r.full_name, student_phone=r.phone,
            class_id=r.Assessment.class_id, class_name=r.name,
            title="Nota baixa",
            detail=(
                f"{_num(r.StudentGrade.score)}"
                f"{f' de {r.Assessment.max_score}' if r.Assessment.max_score else ''}"
                f" em {r.Assessment.title or 'avaliação'}"
                f" (mínimo {_num(r.Assessment.min_score if r.Assessment.min_score is not None else DEFAULT_MIN_SCORE)})"
            ),
            occurred_at=r.StudentGrade.created_at,
        )
        for r in rows
    ]


async def _loan_alerts(db: AsyncSession, now: datetime) -> list[AlertResponse]:
    loans = (await db.execute(
        select(BookLoan).where(BookLoan.returned_at.is_(None), BookLoan.due_date < now)
    )).scalars().all()
    return [
        AlertResponse(
            key=f"overdue_loan:{loan.id}",
            type="overdue_loan", severity="medium",
            ref_id=loan.id, student_id=loan.student_id,
            student_name=loan.student.full_name if loan.student else None,
            student_phone=loan.student.phone if loan.student else None,
            title="Empréstimo atrasado",
            detail=f"{loan.book.title if loan.book else 'Livro'} · venceu há {(now - loan.due_date).days} dia(s)",
            occurred_at=loan.due_date,
        )
        for loan in loans
    ]


async def _holiday_alerts(db: AsyncSession, class_ids, now: datetime) -> list[AlertResponse]:
    """Aula ainda agendada num dia marcado como feriado no calendário."""
    horizon = now + timedelta(days=HOLIDAY_LOOKAHEAD_DAYS)
    holidays = (await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.event_type == "holiday",
            CalendarEvent.start_date <= horizon + timedelta(days=1),
            CalendarEvent.end_date >= now - timedelta(days=1),
        )
    )).scalars().all()
    if not holidays:
        return []

    stmt = (
        select(Lesson, Class_.name, Class_.unit_id)
        .join(Class_, Class_.id == Lesson.class_id)
        .where(Lesson.status == "scheduled", Lesson.scheduled_at >= now, Lesson.scheduled_at <= horizon)
    )
    rows = (await db.execute(_in_scope(stmt, Lesson.class_id, class_ids))).all()

    def event_days(ev: CalendarEvent) -> tuple[date, date]:
        start = ev.start_date.replace(tzinfo=None).date()
        end = (ev.end_date or ev.start_date).replace(tzinfo=None).date()
        return start, end

    alerts = []
    for r in rows:
        day = r.Lesson.scheduled_at.astimezone(LOCAL_TZ).date()
        for ev in holidays:
            start, end = event_days(ev)
            # Feriado sem unidade vale para todas; com unidade, só para as turmas dela
            if start <= day <= end and (ev.unit_id is None or ev.unit_id == r.unit_id):
                alerts.append(AlertResponse(
                    key=f"lesson_on_holiday:{r.Lesson.id}",
                    type="lesson_on_holiday", severity="medium",
                    ref_id=r.Lesson.id, class_id=r.Lesson.class_id, class_name=r.name, lesson_id=r.Lesson.id,
                    title="Aula em feriado",
                    detail=f"{ev.title or 'Feriado'} — cancele ou remarque a aula",
                    occurred_at=r.Lesson.scheduled_at,
                ))
                break
    return alerts


async def _class_without_teacher_alerts(db: AsyncSession) -> list[AlertResponse]:
    assigned = select(ClassAssignment.class_id)
    classes = (await db.execute(
        select(Class_).where(Class_.status == "active", Class_.main_teacher_id.is_(None), Class_.id.not_in(assigned))
    )).scalars().all()
    return [
        AlertResponse(
            key=f"class_without_teacher:{c.id}", type="class_without_teacher", severity="high",
            ref_id=c.id, class_id=c.id, class_name=c.name,
            title="Turma sem professor", detail="Turma ativa sem professor principal nem atribuído",
        )
        for c in classes
    ]


async def _missing_attendance_alerts(db: AsyncSession, class_ids, now: datetime) -> list[AlertResponse]:
    """Aula que já terminou (nos últimos 30 dias) e não tem nenhuma presença lançada."""
    has_att = select(Attendance.lesson_id)
    stmt = (
        select(Lesson, Class_.name)
        .join(Class_, Class_.id == Lesson.class_id)
        .where(
            Class_.status == "active", Lesson.status != "cancelled",
            Lesson.scheduled_at >= now - timedelta(days=MISSING_ATTENDANCE_DAYS),
            Lesson.scheduled_at <= now - LESSON_LENGTH,
            Lesson.id.not_in(has_att),
        )
    )
    rows = (await db.execute(_in_scope(stmt, Lesson.class_id, class_ids))).all()
    return [
        AlertResponse(
            key=f"lesson_missing_attendance:{r.Lesson.id}", type="lesson_missing_attendance", severity="high",
            ref_id=r.Lesson.id, class_id=r.Lesson.class_id, class_name=r.name, lesson_id=r.Lesson.id,
            title="Aula sem presença lançada",
            detail="Lance a chamada — ou cancele a aula se ela não aconteceu",
            occurred_at=r.Lesson.scheduled_at,
        )
        for r in rows
    ]


async def _teacher_inactive_alerts(db: AsyncSession, now: datetime) -> list[AlertResponse]:
    """Voluntário cujas turmas tiveram aula nos últimos 14 dias sem nenhuma presença lançada."""
    since = now - timedelta(days=TEACHER_INACTIVE_DAYS)
    links = (await db.execute(
        select(Class_.id, Class_.name, Class_.main_teacher_id).where(Class_.status == "active", Class_.main_teacher_id.is_not(None))
        .union_all(
            select(Class_.id, Class_.name, ClassAssignment.teacher_id)
            .join(ClassAssignment, ClassAssignment.class_id == Class_.id)
            .where(Class_.status == "active")
        )
    )).all()
    classes_by_teacher: dict[uuid.UUID, dict[uuid.UUID, str | None]] = defaultdict(dict)
    for class_id, class_name, teacher_id in links:
        classes_by_teacher[teacher_id][class_id] = class_name
    if not classes_by_teacher:
        return []

    all_class_ids = {cid for d in classes_by_teacher.values() for cid in d}
    att_lessons = select(Attendance.lesson_id)
    lesson_rows = (await db.execute(
        select(Lesson.class_id, Lesson.scheduled_at, Lesson.id.in_(att_lessons).label("has_att"))
        .where(Lesson.class_id.in_(all_class_ids), Lesson.status != "cancelled", Lesson.scheduled_at <= now - LESSON_LENGTH)
    )).all()
    last_att: dict[uuid.UUID, datetime] = {}
    recent: dict[uuid.UUID, list] = defaultdict(list)
    for r in lesson_rows:
        if r.has_att and (r.class_id not in last_att or r.scheduled_at > last_att[r.class_id]):
            last_att[r.class_id] = r.scheduled_at
        if r.scheduled_at >= since:
            recent[r.class_id].append(r)

    teachers = {u.id: u for u in (await db.execute(
        select(User).where(User.id.in_(classes_by_teacher.keys()), User.status == "active")
    )).scalars().all()}

    alerts = []
    for teacher_id, classes in classes_by_teacher.items():
        t = teachers.get(teacher_id)
        if not t:
            continue
        recent_lessons = [r for cid in classes for r in recent.get(cid, [])]
        if not recent_lessons or any(r.has_att for r in recent_lessons):
            continue
        last = max((last_att[c] for c in classes if c in last_att), default=None)
        since_txt = f"sem lançar presença desde {last.astimezone(LOCAL_TZ):%d/%m}" if last else "nunca lançou presença"
        alerts.append(AlertResponse(
            key=f"teacher_inactive:{teacher_id}", type="teacher_inactive", severity="medium",
            ref_id=teacher_id, teacher_name=t.name, teacher_phone=t.telefone,
            title="Voluntário sem lançar presença",
            detail=f"{t.name or 'Professor'} · {since_txt} · {len(recent_lessons)} aula(s) sem chamada em {', '.join(filter(None, classes.values()))}",
            # Aula mais recente sem chamada: ao ser tratado, só volta se outra aula passar sem chamada
            occurred_at=max(r.scheduled_at for r in recent_lessons),
        ))
    return alerts


async def _latest_followups(db: AsyncSession, alerts: list[AlertResponse]) -> dict[tuple, StudentFollowup]:
    if not alerts:
        return {}
    rows = (await db.execute(
        select(StudentFollowup)
        .where(StudentFollowup.ref_id.in_({a.ref_id for a in alerts}))
        .order_by(StudentFollowup.created_at)
    )).scalars().all()
    # Ordenado por data: o último sobrescreve
    return {(f.alert_type, f.ref_id, f.student_id): f for f in rows}


# Tipos em que um fato novo (ex.: outra falta) reabre a pendência já tratada.
# Nos demais, occurred_at pode ser a data futura da aula e não indica fato novo.
REOPEN_ON_NEW_FACT = {"attendance_risk", "teacher_inactive"}


def _is_handled(alert: AlertResponse, f: StudentFollowup, now: datetime) -> bool:
    if alert.type in REOPEN_ON_NEW_FACT and alert.occurred_at and alert.occurred_at > f.created_at:
        return False  # fato novo depois do acompanhamento
    if f.resolution == "snoozed":
        return f.snooze_until is not None and f.snooze_until > now
    return True


async def compute_alerts(db: AsyncSession, user) -> list[AlertResponse]:
    now = datetime.now(timezone.utc)
    class_ids = await _visible_class_ids(db, user)

    alerts = (
        await _attendance_alerts(db, class_ids)
        + await _highlight_alerts(db, class_ids, user, now)
        + await _homework_alerts(db, class_ids, now)
        + await _holiday_alerts(db, class_ids, now)
        + await _grade_alerts(db, class_ids, now)
        + await _missing_attendance_alerts(db, class_ids, now)
    )
    if class_ids is None:
        # Visão de gestão: só admin/coordenação
        alerts += await _loan_alerts(db, now)
        alerts += await _class_without_teacher_alerts(db)
        alerts += await _teacher_inactive_alerts(db, now)

    followups = await _latest_followups(db, alerts)
    visible = []
    for a in alerts:
        f = followups.get((a.type, a.ref_id, a.student_id))
        if f is not None:
            if _is_handled(a, f, now):
                continue
            a.last_followup = LastFollowup(
                resolution=f.resolution, note=f.note,
                created_by_name=f.creator.name if f.creator else None, created_at=f.created_at,
            )
        visible.append(a)

    severity_order = {"high": 0, "medium": 1, "low": 2}
    epoch = datetime.min.replace(tzinfo=timezone.utc)
    visible.sort(key=lambda a: (severity_order[a.severity], -(a.occurred_at or epoch).timestamp()))
    return visible


async def create_followup(db: AsyncSession, body: FollowupCreate, user) -> FollowupResponse:
    # Só é possível agir sobre uma pendência que o próprio usuário enxerga
    alerts = await compute_alerts(db, user)
    if not any(a.type == body.alert_type and a.ref_id == body.ref_id and a.student_id == body.student_id for a in alerts):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pendência não encontrada ou já tratada")

    followup = StudentFollowup(
        alert_type=body.alert_type, ref_id=body.ref_id, student_id=body.student_id,
        resolution=body.resolution, note=(body.note or "").strip() or None,
        snooze_until=datetime.now(timezone.utc) + timedelta(days=body.snooze_days) if body.resolution == "snoozed" else None,
        created_by=user.id,
    )
    db.add(followup)
    await db.commit()
    await db.refresh(followup)
    return _to_response(followup, user.name)


async def list_followups(db: AsyncSession, student_id: uuid.UUID, user) -> list[FollowupResponse]:
    class_ids = await _visible_class_ids(db, user)
    if class_ids is not None:
        enrolled = await db.execute(
            select(Enrollment.id).where(Enrollment.student_id == student_id, Enrollment.class_id.in_(class_ids)).limit(1)
        )
        if enrolled.scalar_one_or_none() is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Permissão negada")

    rows = (await db.execute(
        select(StudentFollowup).where(StudentFollowup.student_id == student_id).order_by(StudentFollowup.created_at.desc())
    )).scalars().all()
    return [_to_response(f, f.creator.name if f.creator else None) for f in rows]


def _to_response(f: StudentFollowup, creator_name: str | None) -> FollowupResponse:
    return FollowupResponse(
        id=f.id, alert_type=f.alert_type, ref_id=f.ref_id, student_id=f.student_id,
        resolution=f.resolution, note=f.note, snooze_until=f.snooze_until,
        created_by_name=creator_name, created_at=f.created_at,
    )
