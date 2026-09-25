"""
Seed de demonstração: turmas, alunos, aulas e chamadas cobrindo todas as faixas
de frequência (risco de evasão, atenção, regular e sem registros).

Uso (somente desenvolvimento):
    docker compose exec backend python seed_demo.py

Idempotente: tudo fica na unidade "Unidade Demo" e é apagado e recriado a cada execução.
"""
from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from decimal import Decimal

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.tz import LOCAL_TZ
from app.models import (  # noqa — importa todos os modelos
    Assessment, Attendance, Book, BookLoan, Class_, Enrollment, Lesson, LessonReport, Student,
    CalendarEvent, StudentFollowup, StudentGrade, StudentHighlight, Unit, User,
)

UNIT_NAME = "Unidade Demo"
TEACHER_EMAIL = "professora.demo@ipng.org"
VOLUNTEER_EMAIL = "voluntario.demo@ipng.org"  # sem lançar presença → alerta de voluntário inativo
TEACHER_PASSWORD = "demo123"
BOOK_TITLE = "Livro Demo — Graded Reader"

# Perfis variados para a tela de Análise (idade, escolaridade)
EDUCATION = ["fundamental_incompleto", "fundamental_completo", "medio_incompleto", "medio_completo",
             "superior_incompleto", "superior_completo", "pos_graduacao"]
_AGES = [9, 12, 15, 17, 19, 23, 28, 35, 42, 51, 63, 16, 21, 30, 11, 45]


def _demo_birth(i: int):
    today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    return today.replace(year=today.year - _AGES[i % len(_AGES)], day=min(today.day, 28)) - timedelta(days=37 * (i % 9) + 1)


# Aniversariantes: um hoje e um ainda neste mês (tela Aniversariantes → WhatsApp)
_today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
BIRTHDAYS = {
    "Helena Castro": _today.replace(year=_today.year - 17),
    "Igor Nascimento": _today.replace(year=_today.year - 22, day=28 if _today.day != 28 else 27),
}

# Cada aluno: (nome, presenças, atrasos, justificadas). O restante das aulas vira falta.
# Atrasos contam como presença no cálculo; justificadas contam como ausência.
# Um 5º elemento opcional fixa a sequência exata (P/L/J/A) em vez de espalhar as faltas.
TURMAS = [
    {
        "name": "Demo · Intermediário (mista)",
        "level": "B1",
        "lessons": 16,
        "day_offset": 1,  # aula semanal no dia de amanhã (que é feriado demo)
        "students": [
            ("Beatriz Almeida",   9, 0, 2),  # 56,3%  → risco
            ("Carlos Mendes",     7, 1, 0),  # 50,0%  → risco
            ("Diego Ferreira",   10, 1, 3),  # 68,8%  → risco
            ("Elaine Souza",     12, 0, 1),  # 75,0%  → atenção (limite)
            ("Fábio Ribeiro",    12, 1, 0),  # 81,3%  → atenção
            ("Gabriela Lima",    14, 0, 1),  # 87,5%  → regular
            ("Helena Castro",    15, 0, 0),  # 93,8%  → regular
            ("Igor Nascimento",  15, 1, 0),  # 100%   → regular
            ("João Pereira",     None, 0, 0),  # matriculado sem chamadas → sem registros
            ("Rafaela Duarte",   13, 0, 0, "PPPPPPPPPPPPPAAA"),  # 81,3% mas 3 faltas seguidas → pendência
        ],
    },
    {
        "name": "Demo · Básico (turma crítica)",
        "level": "A1",
        "day_offset": 0,  # aula semanal hoje, começando agora
        "lessons": 10,
        "students": [
            ("Karina Oliveira",   5, 0, 1),  # 50%
            ("Lucas Barbosa",     6, 0, 2),  # 60%
            ("Marina Rocha",      8, 0, 0),  # 80%
            ("Nicolas Teixeira",  4, 1, 0),  # 50%
        ],
    },
    {
        "name": "Demo · Avançado (sem aulas)",
        "level": "C1",
        "weekday": 5, "start": time(9, 0),  # sábados 9h–11h, sem aulas geradas: use "Gerar aulas"
        "lessons": 0,
        "students": [
            ("Olívia Martins", None, 0, 0),
            ("Pedro Cardoso",  None, 0, 0),
        ],
    },
]


async def cleanup(db: AsyncSession) -> None:
    unit = (await db.execute(select(Unit).where(Unit.name == UNIT_NAME))).scalar_one_or_none()
    if unit:
        class_ids = select(Class_.id).where(Class_.unit_id == unit.id)
        # lessons/assessments usam SET NULL na turma, então precisam ser removidos explicitamente
        student_ids = select(Student.id).where(Student.unit_id == unit.id)
        lesson_ids = select(Lesson.id).where(Lesson.class_id.in_(class_ids))
        # empréstimos não têm cascade para aluno; checagens de dever não têm aluno
        await db.execute(delete(BookLoan).where(BookLoan.student_id.in_(student_ids)))
        await db.execute(delete(StudentFollowup).where(StudentFollowup.ref_id.in_(lesson_ids)))
        await db.execute(delete(Lesson).where(Lesson.class_id.in_(class_ids)))
        await db.execute(delete(Assessment).where(Assessment.class_id.in_(class_ids)))
        await db.execute(delete(CalendarEvent).where(CalendarEvent.unit_id == unit.id))
        await db.execute(delete(Class_).where(Class_.unit_id == unit.id))
        await db.execute(delete(Student).where(Student.unit_id == unit.id))
        await db.delete(unit)
    await db.execute(delete(Book).where(Book.title == BOOK_TITLE))
    await db.execute(delete(User).where(User.email.in_([TEACHER_EMAIL, VOLUNTEER_EMAIL])))
    await db.flush()


async def seed(db: AsyncSession) -> None:
    await cleanup(db)

    teacher = User(
        name="Professora Demo", email=TEACHER_EMAIL, password_hash=hash_password(TEACHER_PASSWORD),
        role="teacher", status="active",
    )
    db.add(teacher)
    unit = Unit(name=UNIT_NAME, address="Rua Exemplo, 123", status="active")
    db.add(unit)
    await db.flush()

    now = datetime.now(timezone.utc).replace(hour=19, minute=0, second=0, microsecond=0)
    summary: list[str] = []
    students_by_name: dict[str, tuple[Student, Class_]] = {}

    local_now = datetime.now(LOCAL_TZ)
    for t in TURMAS:
        n = t["lessons"]
        # Horário fixo da turma; as aulas passadas seguem o mesmo dia/horário semanal
        if "day_offset" in t:
            base_day = local_now.date() + timedelta(days=t["day_offset"])
            if t["day_offset"] == 0:
                started = local_now - timedelta(minutes=15)
                start_t = started.time().replace(minute=started.minute - started.minute % 5, second=0, microsecond=0)
            else:
                start_t = time(16, 0)
            weekday = base_day.weekday()
        else:
            base_day, weekday, start_t = None, t["weekday"], t["start"]
        end_t = (datetime.combine(local_now.date(), start_t) + timedelta(hours=2)).time()
        at = lambda day: datetime.combine(day, start_t, tzinfo=LOCAL_TZ)  # noqa: E731

        cls = Class_(
            name=t["name"], level=t["level"], unit_id=unit.id, main_teacher_id=teacher.id,
            status="active", start_date=now - timedelta(weeks=n + 1),
            schedule_weekday=weekday, schedule_start=start_t, schedule_end=end_t,
        )
        db.add(cls)
        await db.flush()

        lessons = [
            Lesson(class_id=cls.id, teacher_id=teacher.id, status="completed",
                   scheduled_at=at(base_day - timedelta(weeks=n - i)))
            for i in range(n)
        ]
        db.add_all(lessons)

        assessment = None
        if n:
            assessment = Assessment(
                class_id=cls.id, title="Prova 1", type="written", semester="2026.2",
                date=now - timedelta(weeks=2), max_score=10, created_by=teacher.id,
            )
            db.add(assessment)
        await db.flush()

        summary.append(f"\n  {t['name']} ({n} aulas)")
        if n:
            # Dever passado na última aula → vira "checar dever" na próxima aula.
            # Uma turma tem aula acontecendo agora (tela "Hoje" → Fazer chamada); as outras, amanhã.
            db.add(LessonReport(lesson_id=lessons[-1].id, summary="Simple past", homework="Exercícios 3 e 4 da página 42 (simple past)"))
            db.add(Lesson(class_id=cls.id, teacher_id=teacher.id, status="scheduled", scheduled_at=at(base_day)))

        for idx, (name, present, late, justified, *pattern) in enumerate(t["students"]):
            slug = name.lower().split()[0]
            student = Student(
                full_name=name, email=f"{slug}.demo@example.com", phone="(11) 90000-0000",
                unit_id=unit.id, status="active", terms_accepted=True,
                birth_date=BIRTHDAYS.get(name) or _demo_birth(len(students_by_name) + idx),
                gender="F" if name.split()[0][-1] == "a" or name.startswith(("Beatriz", "Elaine", "Helena", "Karina", "Marina", "Olívia")) else "M",
                education_level=EDUCATION[(len(students_by_name) + idx) % len(EDUCATION)],
            )
            db.add(student)
            await db.flush()
            db.add(Enrollment(student_id=student.id, class_id=cls.id, status="active"))

            if present is None or n == 0:
                summary.append(f"    {name:<20} sem registros")
                continue

            absent = n - present - late - justified
            assert absent >= 0, f"{name}: soma maior que o número de aulas"
            # Espalha as faltas pelo período em vez de concentrar no fim
            if pattern:
                code = {"P": "present", "L": "late", "J": "justified", "A": "absent"}
                statuses = [code[c] for c in pattern[0]]
            else:
                statuses = ["present"] * present + ["late"] * late + ["justified"] * justified + ["absent"] * absent
                statuses = statuses[idx % n:] + statuses[:idx % n]
            for lesson, status in zip(lessons, statuses):
                db.add(Attendance(
                    lesson_id=lesson.id, student_id=student.id, status=status,
                    notes="Atestado médico" if status == "justified" else None,
                ))

            rate = (present + late) / n * 100
            if assessment:
                score = Decimal(str(round(max(0, min(10, rate / 10 - 2)), 1)))  # <60% de frequência → nota abaixo de 4
                if name == "Diego Ferreira":
                    score = Decimal("8.5")  # frequência baixa com nota alta → etiqueta "Potencial"
                db.add(StudentGrade(assessment_id=assessment.id, student_id=student.id, score=score))
            summary.append(f"    {name:<20} {rate:5.1f}%")
            students_by_name[name] = (student, cls)

    # Radar de gestão: turma sem professor; voluntário cujas aulas recentes ficaram sem chamada
    db.add(Class_(name="Demo · Sem professor", level="A2", unit_id=unit.id, status="active",
                  schedule_weekday=2, schedule_start=time(19, 0), schedule_end=time(21, 0)))
    volunteer = User(name="Voluntário Demo", email=VOLUNTEER_EMAIL, password_hash=hash_password(TEACHER_PASSWORD),
                     role="teacher", status="active", telefone="(11) 90000-0001")
    db.add(volunteer)
    await db.flush()
    conv = Class_(name="Demo · Conversação (sem chamada)", level="B2", unit_id=unit.id, status="active",
                  main_teacher_id=volunteer.id, schedule_weekday=(local_now.date() - timedelta(days=3)).weekday(),
                  schedule_start=time(18, 0), schedule_end=time(20, 0))
    db.add(conv)
    await db.flush()
    for weeks in (1, 0):  # duas aulas passadas (3 e 10 dias atrás), nenhuma com presença
        day = local_now.date() - timedelta(days=3, weeks=weeks)
        db.add(Lesson(class_id=conv.id, teacher_id=volunteer.id, status="scheduled",
                      scheduled_at=datetime.combine(day, time(18, 0), tzinfo=LOCAL_TZ)))
    paula = Student(full_name="Paula Nogueira", unit_id=unit.id, status="active", phone="(11) 90000-0000")
    db.add(paula)
    await db.flush()
    db.add(Enrollment(student_id=paula.id, class_id=conv.id, status="active"))
    summary.append("\n  Radar: turma sem professor, Voluntário Demo com 2 aulas sem chamada")

    # Destaque positivo (oportunidade), destaque negativo e empréstimo atrasado
    igor, igor_cls = students_by_name["Igor Nascimento"]
    db.add(StudentHighlight(
        student_id=igor.id, class_id=igor_cls.id, teacher_id=teacher.id, highlight_type="positive",
        title="100% de presença e ótima evolução na conversação",
        description="Candidato a Day Out / mentoria.",
    ))
    lucas, lucas_cls = students_by_name["Lucas Barbosa"]
    db.add(StudentHighlight(
        student_id=lucas.id, class_id=lucas_cls.id, teacher_id=teacher.id, highlight_type="negative",
        title="Desmotivado, fala em desistir do curso",
        description="Comentou que está difícil conciliar com o trabalho.",
    ))
    book = Book(title=BOOK_TITLE, author="Autor Demo", level="A1", active=True)
    db.add(book)
    await db.flush()
    gabriela, _ = students_by_name["Gabriela Lima"]
    db.add(BookLoan(student_id=gabriela.id, book_id=book.id, borrowed_at=now - timedelta(days=30),
                    due_date=now - timedelta(days=9), status="active"))
    # Feriado (só da Unidade Demo) no dia da próxima aula das turmas sem aula hoje → "Aula em feriado".
    # O calendário grava a data local "como UTC" (ver calendar/page.tsx).
    holiday = local_now.date() + timedelta(days=1)
    db.add(CalendarEvent(
        unit_id=unit.id, title="Feriado Demo (municipal)", event_type="holiday", is_all_day=True, visibility="all",
        start_date=datetime.combine(holiday, time(0, 0), tzinfo=timezone.utc),
        end_date=datetime.combine(holiday, time(23, 59), tzinfo=timezone.utc),
    ))
    summary.append(f"  Feriado Demo em {holiday:%d/%m} (Unidade Demo)")

    summary.append("\n  Extras: destaque negativo (Lucas), empréstimo atrasado (Gabriela),")
    summary.append("          dever de casa a checar na próxima aula, aula acontecendo agora no Básico")

    await db.commit()
    print("[seed_demo] Dados de demonstração criados:" + "\n".join(summary))
    print(f"\n  Professora: {TEACHER_EMAIL} / {TEACHER_PASSWORD}")
    print(f"  Voluntário: {VOLUNTEER_EMAIL} / {TEACHER_PASSWORD}")


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await seed(db)


if __name__ == "__main__":
    asyncio.run(main())
