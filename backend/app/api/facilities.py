from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models import HealthcareFacility
from backend.app.services.facility_service import FacilityService

router = APIRouter(prefix="/facilities", tags=["Healthcare Facilities"])

@router.get("")
def list_facilities(
    district: Optional[str] = Query(None),
    facility_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = FacilityService(db)
    facs = service.list_facilities(district=district, facility_type=facility_type)
    return [
        {
            "id": f.id,
            "name": f.name,
            "facility_type": f.facility_type,
            "district": f.district,
            "block": f.block,
            "address": f.address,
            "phone_number": f.phone_number,
            "emergency_helpline": f.emergency_helpline,
            "services_offered": f.services_offered or [],
            "verified": f.verified,
            "last_verified_at": f.last_verified_at
        }
        for f in facs
    ]

@router.get("/recommend")
def recommend_facility(
    triage_level: int = Query(..., ge=1, le=4),
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    service = FacilityService(db)
    if not district or not district.strip():
        return {"facility": None, "message": "No district specified."}

    clean_dist = district.strip()
    fac = service.get_recommended_facility(triage_level=triage_level, district=clean_dist)
    if not fac or (fac.district and fac.district.strip().lower() != clean_dist.lower()):
        return {"facility": None, "message": f"No configured healthcare facility found in {clean_dist}."}
    return {
        "facility": {
            "id": fac.id,
            "name": fac.name,
            "facility_type": fac.facility_type,
            "district": fac.district,
            "block": fac.block,
            "address": fac.address,
            "phone_number": fac.phone_number,
            "emergency_helpline": fac.emergency_helpline,
            "services_offered": fac.services_offered or []
        }
    }
