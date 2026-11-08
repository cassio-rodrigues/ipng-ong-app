from __future__ import annotations

from datetime import date as date_type, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_role
from app.core.privacy import is_privileged, students_in_classes, visible_class_ids
from app.core.tz import LOCAL_TZ
from app.models.book import Book
from app.domains.stats.schemas import (
    AnalysisClass,
    AnalysisStudent,
    PeriodMetric,
    PeriodStats,
    ReportSummary,
    SummaryClass,
    SummaryHighlight,
    SummaryLesson,
    SummaryLowAttendance,
    BirthdayPerson,
    ClassCount,
    ClassStats,
    DashboardStats,
    GenderBreakdown,
    StudentStats,
    TeacherStats,
)
from app.models.attendance import Attendance
from app.models.class_ import Class_
from app.models.activity import StudentHighlight
from app.models.book import BookChapter
from app.models.lesson import Lesson
from app.models.student import Enrollment, Student
from app.models.unit import Unit
from app.models.user import User

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    # Students
    student_rows = (await db.execute(
        select(Student.status, Student.gender, func.count().label("n"))
        .group_by(Student.status, Student.gender)
    )).all()

    s_total = sum(r.n for r in student_rows)
    s_active = sum(r.n for r in student_rows if r.status == "active")
    s_inactive = sum(r.n for r in student_rows if r.status != "active")
    gender = GenderBreakdown(
        M=sum(r.n for r in student_rows if r.gender == "M"),
        F=sum(r.n for r in student_rows if r.gender == "F"),
        O=sum(r.n for r in student_rows if r.gender == "O"),
        unknown=sum(r.n for r in student_rows if r.gender not in ("M", "F", "O")),
    )

    # Teachers
    teacher_rows = (await db.execute(
        select(User.status, func.count().label("n"))
        # Volunteacher: perfil Professor ou "Professor" nos perfis adicionais
        .where(or_(User.role == "teacher", User.atribuicoes.any("teacher")))
        .group_by(User.status)
    )).all()

    t_total = sum(r.n for r in teacher_rows)
    t_active = sum(r.n for r in teacher_rows if r.status == "active")
    t_inactive = sum(r.n for r in teacher_rows if r.status != "active")

    # Classes
    class_rows = (await db.execute(
        select(Class_.status, func.count().label("n"))
        .group_by(Class_.status)
    )).all()

    c_total = sum(r.n for r in class_rows)
    c_active = sum(r.n for r in class_rows if r.status == "active")

    # Students per class (via enrollments)
    spc_rows = (await db.execute(
        select(Class_.id, Class_.name, func.count(Enrollment.id).label("n"))
        .join(Enrollment, Enrollment.class_id == Class_.id, isouter=True)
        .where(Enrollment.status == "active")
        .group_by(Class_.id, Class_.name)
        .order_by(func.count(Enrollment.id).desc())
        .limit(20)
    )).all()

    students_per_class = [
        ClassCount(class_id=str(r.id), class_name=r.name or "—", count=r.n)
        for r in spc_rows
    ]

    # Absences per class (via lessons → attendance)
    abs_rows = (await db.execute(
        select(Class_.id, Class_.name, func.count(Attendance.id).label("n"))
        .join(Lesson, Lesson.class_id == Class_.id)
        .join(Attendance, Attendance.lesson_id == Lesson.id)
        .where(Attendance.status == "absent")
        .group_by(Class_.id, Class_.name)
        .order_by(func.count(Attendance.id).desc())
        .limit(20)
    )).all()

    absences_per_class = [
        ClassCount(class_id=str(r.id), class_name=r.name or "—", count=r.n)
        for r in abs_rows
    ]

    return DashboardStats(
        students=StudentStats(total=s_total, active=s_active, inactive=s_inactive, by_gender=gender),
        teachers=TeacherStats(total=t_total, active=t_active, inactive=t_inactive),
        classes=ClassStats(total=c_total, active=c_active),
        students_per_class=students_per_class,
        absences_per_class=absences_per_class,
    )


@router.get("/birthdays", response_model=list[BirthdayPerson])
async def birthday_list(
    month: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    target_month = month if month else date_type.today().month
    scope = await visible_class_ids(db, current_user)

    # Alunos com aniversário no mês — agrega turmas via string_agg
    student_rows = (await db.execute(
        select(
            Student.id,
            Student.full_name,
            Student.birth_date,
            Student.gender,
            Student.phone,
            Unit.name.label("unit_name"),
            func.string_agg(Class_.name, ", ").label("class_names"),
        )
        .outerjoin(Unit, Unit.id == Student.unit_id)
        .outerjoin(
            Enrollment,
            (Enrollment.student_id == Student.id) & (Enrollment.status == "active"),
        )
        .outerjoin(Class_, Class_.id == Enrollment.class_id)
        .where(func.extract("month", Student.birth_date) == target_month)
        .where(Student.status == "active")
        .where(Student.id.in_(students_in_classes(scope)) if scope is not None else true())
        .group_by(Student.id, Unit.name)
        .order_by(func.extract("day", Student.birth_date))
    )).all()

    # Professores/usuários com aniversário no mês
    teacher_rows = (await db.execute(
        select(User.id, User.name, User.birth_date, User.gender, User.role, User.telefone)
        .where(func.extract("month", User.birth_date) == target_month)
        .where(User.status == "active")
        .order_by(func.extract("day", User.birth_date))
    )).all()

    result: list[BirthdayPerson] = []

    for r in student_rows:
        if not r.birth_date:
            continue
        result.append(BirthdayPerson(
            id=str(r.id),
            name=r.full_name or "—",
            type="student",
            birth_date=r.birth_date.isoformat(),
            day=r.birth_date.day,
            gender=r.gender,
            classes=[c.strip() for c in r.class_names.split(",")] if r.class_names else [],
            unit=r.unit_name,
            role=None,
            phone=r.phone,
        ))

    for r in teacher_rows:
        if not r.birth_date:
            continue
        result.append(BirthdayPerson(
            id=str(r.id),
            name=r.name or "—",
            type="teacher",
            birth_date=r.birth_date.isoformat(),
            day=r.birth_date.day,
            gender=r.gender,
            classes=[],
            unit=None,
            role=r.role,
            phone=r.telefone if is_privileged(current_user) or r.id == current_user.id else None,
        ))

    result.sort(key=lambda x: x.day)
    return result


# ── Análise cruzada ────────────────────────────────────────────────────────────
# Devolve uma linha por aluno com as dimensões; os filtros se cruzam no navegador
# (volume da ONG é de centenas de alunos). Só gestão: contém dados pessoais.

@router.get("/students-analysis", response_model=list[AnalysisStudent])
async def students_analysis(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    today = date_type.today()
    students = (await db.execute(select(Student))).scalars().all()

    class_rows = (await db.execute(
        select(Enrollment.student_id, Class_.id, Class_.name, Class_.level, Book.title)
        .join(Class_, Class_.id == Enrollment.class_id)
        .outerjoin(Book, Book.id == Class_.book_id)
        .where(Enrollment.status == "active")
    )).all()
    classes_by_student: dict = {}
    for r in class_rows:
        classes_by_student.setdefault(r.student_id, []).append(
            AnalysisClass(id=str(r.id), name=r.name, level=r.level, book=r.title)
        )

    att_rows = (await db.execute(
        select(
            Attendance.student_id,
            func.count().label("total"),
            func.sum(case((Attendance.status.in_(["present", "late"]), 1), else_=0)).label("attended"),
        ).group_by(Attendance.student_id)
    )).all()
    rate_by_student = {r.student_id: round(r.attended / r.total * 100, 1) for r in att_rows if r.total}

    def age(b):
        if not b:
            return None
        return today.year - b.year - ((today.month, today.day) < (b.month, b.day))

    return [
        AnalysisStudent(
            id=str(s.id), full_name=s.full_name, gender=s.gender,
            birth_date=s.birth_date.isoformat() if s.birth_date else None, age=age(s.birth_date),
            education_level=s.education_level,
            unit_id=str(s.unit_id) if s.unit_id else None, unit_name=s.unit.name if s.unit else None,
            status=s.status, created_at=s.created_at.isoformat() if s.created_at else None,
            classes=classes_by_student.get(s.id, []),
            attendance_rate=rate_by_student.get(s.id),
        )
        for s in students
    ]


# ── Comparativo temporal ───────────────────────────────────────────────────────

def _period_bounds(period: str, now: datetime) -> tuple[datetime, datetime, datetime, datetime]:
    """(início, fim, início anterior, fim anterior). Semestre/ano: período até hoje vs o
    mesmo trecho (mesma duração) do semestre/ano anterior."""
    if period == "semester":
        start = now.replace(month=1 if now.month <= 6 else 7, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1, month=7) if start.month == 1 else start.replace(month=1)
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        prev_start = start.replace(year=start.year - 1)
    else:  # 30d
        start = now - timedelta(days=30)
        prev_start = start - timedelta(days=30)
    return start, now, prev_start, prev_start + (now - start)


async def _period_metrics(db: AsyncSession, a: datetime, b: datetime) -> tuple[int, int, float, int]:
    """(novos alunos, aulas com chamada, % frequência, faltas) no intervalo [a, b)."""
    new = (await db.execute(
        select(func.count()).select_from(Student).where(Student.created_at >= a, Student.created_at < b)
    )).scalar_one()
    att = (await db.execute(
        select(
            func.count(func.distinct(Attendance.lesson_id)).label("lessons"),
            func.count().label("total"),
            func.sum(case((Attendance.status.in_(["present", "late"]), 1), else_=0)).label("attended"),
            func.sum(case((Attendance.status == "absent", 1), else_=0)).label("absent"),
        )
        .join(Lesson, Lesson.id == Attendance.lesson_id)
        .where(Lesson.scheduled_at >= a, Lesson.scheduled_at < b)
    )).one()
    rate = round((att.attended or 0) / att.total * 100, 1) if att.total else 0.0
    return new, att.lessons or 0, rate, att.absent or 0


@router.get("/period", response_model=PeriodStats)
async def period_stats(
    period: str = "30d",
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    now = datetime.now(LOCAL_TZ)
    if period == "custom":
        # Intervalo escolhido (datas inclusivas) vs o intervalo de mesma duração logo antes dele
        if not start_date or not end_date:
            raise HTTPException(status_code=422, detail="Informe a data inicial e a final")
        if start_date > end_date:
            raise HTTPException(status_code=422, detail="A data inicial deve ser anterior à final")
        start = datetime.combine(start_date, datetime.min.time(), tzinfo=LOCAL_TZ)
        end = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=LOCAL_TZ)
        pend = start
        pstart = start - (end - start)
        shown_end, shown_pend = end_date, (pend - timedelta(days=1)).date()
    else:
        if period not in ("30d", "semester", "year"):
            period = "30d"
        start, end, pstart, pend = _period_bounds(period, now)
        shown_end, shown_pend = end.date(), pend.date()

    cur, prev = await _period_metrics(db, start, end), await _period_metrics(db, pstart, pend)
    return PeriodStats(
        period=period, start=start.date().isoformat(), end=shown_end.isoformat(),
        previous_start=pstart.date().isoformat(), previous_end=shown_pend.isoformat(),
        new_students=PeriodMetric(current=cur[0], previous=prev[0]),
        lessons_given=PeriodMetric(current=cur[1], previous=prev[1]),
        attendance_rate=PeriodMetric(current=cur[2], previous=prev[2]),
        absences=PeriodMetric(current=cur[3], previous=prev[3]),
    )


# ── Resumo de relatórios de aula ───────────────────────────────────────────────
# Junta, para o intervalo, os números gerais e o que cada turma registrou nas aulas.
# O texto é montado no navegador. Só gestão: contém nomes e observações sobre alunos.

SUMMARY_LOW_RATE = 60.0       # mesmo corte da pendência de evasão
SUMMARY_MIN_RECORDS = 3       # abaixo disso a porcentagem não diz muito num recorte curto


@router.get("/report-summary", response_model=ReportSummary)
async def report_summary(
    start_date: date_type,
    end_date: date_type,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role("admin", "coordinator")),
):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="A data inicial deve ser anterior à final")
    if (end_date - start_date).days > 366:
        raise HTTPException(status_code=422, detail="Escolha um intervalo de até um ano")
    a = datetime.combine(start_date, datetime.min.time(), tzinfo=LOCAL_TZ)
    b = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=LOCAL_TZ)

    new, lessons_given, rate, absences = await _period_metrics(db, a, b)
    active_students = (await db.execute(
        select(func.count()).select_from(Student).where(Student.status == "active")
    )).scalar_one()

    lessons = (await db.execute(
        select(Lesson).where(Lesson.scheduled_at >= a, Lesson.scheduled_at < b,
               or_(Lesson.status.is_(None), Lesson.status != "cancelled"))
        .order_by(Lesson.scheduled_at)
    )).scalars().all()
    lesson_ids = [l.id for l in lessons]

    # Presença por aula e por aluno/turma no intervalo
    per_lesson: dict = {}
    per_student: dict = {}
    if lesson_ids:
        rows = (await db.execute(
            select(Attendance.lesson_id, Attendance.student_id, Attendance.status, Lesson.class_id)
            .join(Lesson, Lesson.id == Attendance.lesson_id)
            .where(Attendance.lesson_id.in_(lesson_ids))
        )).all()
        for r in rows:
            ok = r.status in ("present", "late")
            pl = per_lesson.setdefault(r.lesson_id, [0, 0])
            pl[0] += ok
            pl[1] += 1
            ps = per_student.setdefault((r.class_id, r.student_id), [0, 0, 0])
            ps[0] += ok
            ps[1] += 1
            ps[2] += r.status == "absent"

    chapter_ids = {l.chapter_id for l in lessons if l.chapter_id}
    chapters = {}
    if chapter_ids:
        chapters = dict((await db.execute(
            select(BookChapter.id, BookChapter.title).where(BookChapter.id.in_(chapter_ids))
        )).all())

    class_ids = {l.class_id for l in lessons if l.class_id}
    classes = {}
    roster: dict = {}
    if class_ids:
        classes = {c.id: c for c in (await db.execute(select(Class_).where(Class_.id.in_(class_ids)))).scalars().all()}
        for cid, sid, name in (await db.execute(
            select(Enrollment.class_id, Student.id, Student.full_name)
            .join(Student, Student.id == Enrollment.student_id)
            .where(Enrollment.class_id.in_(class_ids))
        )).all():
            roster.setdefault(cid, {})[sid] = name

    by_class: dict = {}
    with_report = 0
    for l in lessons:
        if not l.class_id:
            continue
        rep = l.report
        if rep and any([rep.summary, rep.activities_done, rep.homework, rep.observations]):
            with_report += 1
        att = per_lesson.get(l.id, [0, 0])
        by_class.setdefault(l.class_id, []).append(SummaryLesson(
            date=l.scheduled_at.astimezone(LOCAL_TZ).date().isoformat() if l.scheduled_at else "",
            status=l.status,
            teacher=l.teacher.name if l.teacher else None,
            chapter=chapters.get(l.chapter_id),
            attended=att[0], total=att[1],
            summary=rep.summary if rep else None,
            activities_done=rep.activities_done if rep else None,
            homework=rep.homework if rep else None,
            observations=rep.observations if rep else None,
        ))

    out_classes = []
    for cid, items in by_class.items():
        c = classes.get(cid)
        names = roster.get(cid, {})
        low = []
        tot_ok = tot = 0
        for (k_cid, sid), (ok, total, absent) in per_student.items():
            if k_cid != cid:
                continue
            tot_ok += ok
            tot += total
            r = ok / total * 100
            if total >= SUMMARY_MIN_RECORDS and r < SUMMARY_LOW_RATE:
                low.append(SummaryLowAttendance(name=names.get(sid) or "Aluno", rate=round(r, 1), absences=absent, total=total))
        low.sort(key=lambda x: x.rate)
        out_classes.append(SummaryClass(
            id=str(cid), name=c.name if c else None,
            unit=c.unit.name if c and c.unit else None, level=c.level if c else None,
            teacher=c.main_teacher.name if c and c.main_teacher else None,
            attendance_rate=round(tot_ok / tot * 100, 1) if tot else None,
            lessons=items, low_attendance=low,
            student_names=sorted({n for n in names.values() if n}),
        ))
    out_classes.sort(key=lambda x: ((x.unit or "").lower(), (x.name or "").lower()))

    hl = (await db.execute(
        select(StudentHighlight).where(StudentHighlight.created_at >= a, StudentHighlight.created_at < b)
        .order_by(StudentHighlight.created_at)
    )).scalars().all()
    highlights = [SummaryHighlight(
        student=h.student.full_name if h.student else None,
        class_name=h.class_.name if h.class_ else None,
        type=h.highlight_type, title=h.title,
        date=h.created_at.astimezone(LOCAL_TZ).date().isoformat() if h.created_at else "",
    ) for h in hl]

    return ReportSummary(
        start=start_date.isoformat(), end=end_date.isoformat(),
        active_students=active_students, new_students=new, lessons_given=lessons_given,
        lessons_with_report=with_report, attendance_rate=rate, absences=absences,
        classes=out_classes, highlights=highlights,
    )
