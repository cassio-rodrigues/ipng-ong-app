from fastapi import APIRouter

from app.domains.auth.router import router as auth_router
from app.domains.users.router import router as users_router
from app.domains.units.router import router as units_router
from app.domains.books.router import router as books_router
from app.domains.classes.router import router as classes_router
from app.domains.students.router import router as students_router
from app.domains.lessons.router import router as lessons_router
from app.domains.attendance.router import router as attendance_router
from app.domains.assessments.router import router as assessments_router
from app.domains.activities.router import router as activities_router
from app.domains.calendar.router import router as calendar_router
from app.domains.audit.router import router as audit_router
from app.domains.stats.router import router as stats_router
from app.domains.loans.router import router as loans_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(units_router)
api_router.include_router(books_router)
api_router.include_router(classes_router)
api_router.include_router(students_router)
api_router.include_router(lessons_router)
api_router.include_router(attendance_router)
api_router.include_router(assessments_router)
api_router.include_router(activities_router)
api_router.include_router(calendar_router)
api_router.include_router(audit_router)
api_router.include_router(stats_router)
api_router.include_router(loans_router)
