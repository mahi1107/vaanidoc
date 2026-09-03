from typing import List
from fastapi import APIRouter
from backend.app.ai.triage.protocols import CLINICAL_PROTOCOLS_CATALOG, ClinicalProtocol

router = APIRouter(prefix="/triage", tags=["Triage Protocols"])

@router.get("/protocols", response_model=List[ClinicalProtocol])
def get_all_protocols():
    """
    Returns auditable list of all standard WHO IMCI / ICMR clinical triage protocols.
    """
    return CLINICAL_PROTOCOLS_CATALOG
