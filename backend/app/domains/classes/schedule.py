"""Aulas recorrentes: a partir do dia/horário fixo da turma, gera as aulas no calendário."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tz import LOCAL_TZ
from app.domains.classes.schemas import GenerateLessonsResult
from app.models.attendance import Attendance
from app.models.calendar import CalendarEvent
from app.models.class_ import Class_
from app.models.lesson import Lesson, LessonMaterial, LessonReport

DEFAULT_WEEKS = 16   # sem data de término, gera ~um semestre à frente
MAX_WEEKS = 52

WEEKDAY_LABEL = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]


def _local_day(dt: datetime) -> date:
    return dt.astimezone(LOCAL_TZ).date()


def _at(day: date, t: time) -> datetime:
    return datetime.combine(day, t, tzinfo=LOCAL_TZ)


async def _holidays(db: AsyncSession, cls: Class_, start: date, end: date) -> set[date]:
    # Calendário guarda a data local "como UTC" (ver calendar/page.tsx): usamos a parte de data direto
    events = (await db.execute(
        select(CalendarEvent).where(
            CalendarEvent.event_type == "holiday",
            CalendarEvent.start_date <= datetime.combine(end, time.max),
            CalendarEvent.end_date >= datetime.combine(start, time.min),
        )
    )).scalars().all()
    days: set[date] = set()
    for ev in events:
        if ev.unit_id is not None and ev.unit_id != cls.unit_id:
            continue
        d = ev.start_date.replace(tzinfo=None).date()
        last = (ev.end_date or ev.start_date).replace(tzinfo=None).date()
        while d <= last:
            days.add(d)
            d += timedelta(days=1)
    return days


async def generate_lessons(db: AsyncSession, cls: Class_, until: date | None = None) -> GenerateLessonsResult:
    """Cria as aulas semanais de hoje até `until` (ou fim da turma / 16 semanas).

    Idempotente: dia que já tem aula da turma (inclusive cancelada ou avulsa) não ganha outra;
    feriados do calendário são pulados.
    """
    if cls.schedule_weekday is None or cls.schedule_start is None:
        raise ValueError("Turma sem dia e horário definidos")

    today = datetime.now(LOCAL_TZ).date()
    start = max(today, _local_day(cls.start_date)) if cls.start_date else today
    if until is None:
        until = _local_day(cls.end_date) if cls.end_date else start + timedelta(weeks=DEFAULT_WEEKS)
    until = min(until, start + timedelta(weeks=MAX_WEEKS))

    first = start + timedelta(days=(cls.schedule_weekday - start.weekday()) % 7)
    days = []
    d = first
    while d <= until:
        days.append(d)
        d += timedelta(weeks=1)

    existing_rows = (await db.execute(
        select(Lesson.scheduled_at).where(
            Lesson.class_id == cls.id,
            Lesson.scheduled_at >= _at(start, time.min),
            Lesson.scheduled_at <= _at(until, time.max),
        )
    )).scalars().all()
    taken = {_local_day(s) for s in existing_rows if s}
    holidays = await _holidays(db, cls, start, until)

    created, existing, skipped = 0, 0, []
    for day in days:
        if day in taken:
            existing += 1
        elif day in holidays:
            skipped.append(day)
        else:
            db.add(Lesson(
                class_id=cls.id, teacher_id=cls.main_teacher_id, book_id=cls.book_id,
                scheduled_at=_at(day, cls.schedule_start), status="scheduled",
            ))
            created += 1
    await db.commit()
    return GenerateLessonsResult(created=created, existing=existing, skipped_holidays=skipped, until=until)


async def drop_future_empty_lessons(db: AsyncSession, cls: Class_, weekday: int, start: time) -> int:
    """Ao mudar o horário da turma: remove aulas futuras do horário antigo que ainda não
    têm chamada, relatório nem material. Aulas avulsas (outro dia/horário) ficam."""
    now = datetime.now(LOCAL_TZ)
    lessons = (await db.execute(
        select(Lesson).where(Lesson.class_id == cls.id, Lesson.status == "scheduled", Lesson.scheduled_at > now)
    )).scalars().all()
    candidates = [
        l.id for l in lessons
        if l.scheduled_at.astimezone(LOCAL_TZ).weekday() == weekday
        and l.scheduled_at.astimezone(LOCAL_TZ).time().replace(second=0, microsecond=0) == start.replace(second=0, microsecond=0)
    ]
    if not candidates:
        return 0
    used = set((await db.execute(select(Attendance.lesson_id).where(Attendance.lesson_id.in_(candidates)))).scalars()) \
        | set((await db.execute(select(LessonReport.lesson_id).where(LessonReport.lesson_id.in_(candidates)))).scalars()) \
        | set((await db.execute(select(LessonMaterial.lesson_id).where(LessonMaterial.lesson_id.in_(candidates)))).scalars())
    to_drop = [i for i in candidates if i not in used]
    if to_drop:
        await db.execute(delete(Lesson).where(Lesson.id.in_(to_drop)))
        await db.commit()
    return len(to_drop)
