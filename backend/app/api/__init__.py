from fastapi import APIRouter
from backend.app.api.calls import router as calls_router
from backend.app.api.cases import router as cases_router
from backend.app.api.facilities import router as facilities_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.asha import router as asha_router
from backend.app.api.followups import router as followups_router
from backend.app.api.triage_protocols import router as triage_router
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.demo import router as demo_router
from backend.app.api.auth import router as auth_router
from backend.app.api.health import router as health_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(health_router)
api_router.include_router(calls_router)
api_router.include_router(cases_router)
api_router.include_router(facilities_router)
api_router.include_router(analytics_router)
api_router.include_router(asha_router)
api_router.include_router(followups_router)
api_router.include_router(triage_router)
api_router.include_router(webhooks_router)
api_router.include_router(demo_router)

__all__ = ["api_router"]
