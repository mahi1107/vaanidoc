from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.services.analytics_service import AnalyticsService
from backend.app.schemas.analytics import (
    OverviewMetrics,
    TriageDistributionItem,
    SymptomTrendItem,
    LanguageDistributionItem,
    CallsTimelineItem,
    DistrictMetricItem
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=OverviewMetrics)
def get_overview(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    days: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_overview_metrics(district=district, exclude_demo=exclude_demo, days=days)

@router.get("/triage", response_model=List[TriageDistributionItem])
def get_triage(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_triage_distribution(district=district, exclude_demo=exclude_demo)

@router.get("/symptoms", response_model=List[SymptomTrendItem])
def get_symptoms(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_symptom_trends(district=district, exclude_demo=exclude_demo)

@router.get("/languages", response_model=List[LanguageDistributionItem])
def get_languages(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_language_distribution(district=district, exclude_demo=exclude_demo)

@router.get("/timeline", response_model=List[CallsTimelineItem])
def get_timeline(
    days: int = Query(7, ge=1, le=30),
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_calls_timeline(days=days, district=district, exclude_demo=exclude_demo)

@router.get("/districts", response_model=List[DistrictMetricItem])
def get_districts(
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    service = AnalyticsService(db)
    return service.get_district_metrics(exclude_demo=exclude_demo)

@router.get("/today")
def get_today_overview(
    district: Optional[str] = Query(None),
    exclude_demo: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Focused today-only metrics for the operational Overview page."""
    service = AnalyticsService(db)
    return service.get_today_overview(district=district, exclude_demo=exclude_demo)
