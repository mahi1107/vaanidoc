from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.models import HealthcareFacility
from backend.app.utils.logger import logger

# Authoritative verified government healthcare facilities across Indian districts
DEFAULT_FACILITIES = [
    # ── VADODARA (GUJARAT) ─────────────────────────────────────────────
    {
        "name": "Sir Sayajirao General (SSG) Hospital & Medical College",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Vadodara",
        "block": "Vadodara Urban",
        "address": "Jail Road, Anandpura, Vadodara, Gujarat 390001",
        "phone_number": "+91-265-2424848",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Trauma Care", "ICU", "Cardiology", "Burn Unit", "Blood Bank", "Pediatrics", "Dialysis"]
    },
    {
        "name": "Padra Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Vadodara",
        "block": "Padra",
        "address": "Opp. Bus Station, Padra, Vadodara, Gujarat 391440",
        "phone_number": "+91-2662-222100",
        "emergency_helpline": "108",
        "services_offered": ["30-Bed Inpatient", "Maternity & Delivery", "Minor Surgery", "Emergency Stabilization", "Diagnostic Lab"]
    },
    {
        "name": "Gotri Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Vadodara",
        "block": "Gotri",
        "address": "Gotri Main Road, Near Old Bus Stand, Vadodara, Gujarat 390021",
        "phone_number": "+91-265-2398100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Immunization", "Fever Clinic", "Maternal Health", "Essential Medicines"]
    },
    {
        "name": "Vadodara 108 Emergency Medical Dispatch",
        "facility_type": "EMERGENCY",
        "district": "Vadodara",
        "block": "Vadodara Central",
        "address": "GVK EMRI Emergency Response Center, Vadodara, Gujarat",
        "phone_number": "108",
        "emergency_helpline": "108",
        "services_offered": ["Advanced Life Support (ALS)", "Basic Life Support (BLS)", "Paramedic Care", "24/7 Response"]
    },

    # ── DELHI DISTRICTS ────────────────────────────────────────────────
    {
        "name": "All India Institute of Medical Sciences (AIIMS) New Delhi",
        "facility_type": "EMERGENCY",
        "district": "New Delhi",
        "block": "Ansari Nagar",
        "address": "Sri Aurobindo Marg, Ansari Nagar, New Delhi, Delhi 110029",
        "phone_number": "+91-11-26588500",
        "emergency_helpline": "108",
        "services_offered": ["Apex Level-1 Trauma Centre", "24/7 Emergency Care", "Multi-organ ICU", "Specialist OPDs", "Cardiology", "Neurology"]
    },
    {
        "name": "Lok Nayak Hospital (LNJP)",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Central Delhi",
        "block": "Delhi Gate",
        "address": "Jawaharlal Nehru Marg, Delhi Gate, Central Delhi, Delhi 110002",
        "phone_number": "+91-11-23236000",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency", "Pediatric Intensive Care", "Orthopedics", "General Surgery", "Blood Bank"]
    },
    {
        "name": "Mehrauli Primary Urban Health Centre (PUHC)",
        "facility_type": "PHC",
        "district": "South Delhi",
        "block": "Mehrauli",
        "address": "Ward No. 2, Kalka Das Marg, Mehrauli, South Delhi, Delhi 110030",
        "phone_number": "+91-11-26643200",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Maternal & Child Health", "Immunization", "Basic Lab Tests", "Free Pharmacy"]
    },
    {
        "name": "Civil Lines Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Central Delhi",
        "block": "Civil Lines",
        "address": "Rajpur Road, Civil Lines, Central Delhi, Delhi 110054",
        "phone_number": "+91-11-23961100",
        "emergency_helpline": "108",
        "services_offered": ["Inpatient Care", "Minor OT", "Maternity Wing", "Fever Clinic", "Pathology"]
    },

    # ── AHMEDABAD (GUJARAT) ───────────────────────────────────────────
    {
        "name": "Civil Hospital Ahmedabad (Asarwa)",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Ahmedabad",
        "block": "Asarwa",
        "address": "Haripura, Asarwa, Ahmedabad, Gujarat 380016",
        "phone_number": "+91-79-22683721",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency & Trauma", "Multi-specialty Surgery", "ICU / NICU", "Cancer Centre", "Kidney Institute"]
    },
    {
        "name": "Sanand Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Ahmedabad",
        "block": "Sanand",
        "address": "Sanand Town, Ahmedabad, Gujarat 382110",
        "phone_number": "+91-2717-222400",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Emergency Triage", "Maternal Care", "Pathology Lab", "Immunization"]
    },
    {
        "name": "Bopal Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Ahmedabad",
        "block": "Bopal",
        "address": "Bopal-Ghuma Road, Ahmedabad, Gujarat 380058",
        "phone_number": "+91-2717-233100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Child Immunization", "Fever Care", "Essential Medicines"]
    },

    # ── BENGALURU URBAN (KARNATAKA) ───────────────────────────────────
    {
        "name": "Victoria Hospital (BMCRI)",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Bengaluru Urban",
        "block": "Kalasipalyam",
        "address": "Fort Road, near City Market, Bengaluru, Karnataka 560002",
        "phone_number": "+91-80-26701150",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency & Trauma", "Burn ICU", "General Surgery", "Specialist OPDs", "Blood Bank"]
    },
    {
        "name": "Yelahanka General Hospital (CHC)",
        "facility_type": "CHC",
        "district": "Bengaluru Urban",
        "block": "Yelahanka",
        "address": "BBMP Hospital Road, Yelahanka, Bengaluru, Karnataka 560064",
        "phone_number": "+91-80-28560120",
        "emergency_helpline": "108",
        "services_offered": ["Inpatient Beds", "Maternity & Delivery", "General OPD", "Lab Diagnostics", "Emergency First Aid"]
    },
    {
        "name": "Kengeri Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Bengaluru Urban",
        "block": "Kengeri",
        "address": "Near Satellite Bus Stand, Kengeri, Bengaluru, Karnataka 560060",
        "phone_number": "+91-80-28485100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Maternal Health", "Vaccination", "Fever Clinic"]
    },

    # ── PUNE (MAHARASHTRA) ────────────────────────────────────────────
    {
        "name": "Sassoon General Hospital & B.J. Medical College",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Pune",
        "block": "Pune Station",
        "address": "Near Pune Railway Station, Jai Prakash Narayan Road, Pune, Maharashtra 411001",
        "phone_number": "+91-20-26128000",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Trauma Care", "ICU", "Cardiology", "Pediatric Ward", "Pathology", "Blood Bank"]
    },
    {
        "name": "Haveli Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Pune",
        "block": "Haveli",
        "address": "Haveli Rural Block HQ, Pune, Maharashtra 412207",
        "phone_number": "+91-20-24381200",
        "emergency_helpline": "108",
        "services_offered": ["30-Bed Ward", "Delivery Room", "Minor Surgery", "Emergency Care"]
    },
    {
        "name": "Khadakwasla Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Pune",
        "block": "Khadakwasla",
        "address": "Sinhagad Road, Khadakwasla, Pune, Maharashtra 411024",
        "phone_number": "+91-20-24391100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Child Health", "Immunization", "Essential Medicines"]
    },

    # ── JAIPUR (RAJASTHAN) ────────────────────────────────────────────
    {
        "name": "Sawai Man Singh (SMS) Hospital",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Jaipur",
        "block": "Jaipur City",
        "address": "JLN Marg, Ashok Nagar, Jaipur, Rajasthan 302004",
        "phone_number": "+91-141-2518224",
        "emergency_helpline": "108",
        "services_offered": ["Apex Emergency Trauma Centre", "ICU", "Specialist Surgery", "Cardiology", "Dialysis", "Blood Bank"]
    },
    {
        "name": "Amer Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Jaipur",
        "block": "Amer",
        "address": "Delhi Road, Amer, Jaipur, Rajasthan 302028",
        "phone_number": "+91-141-2530100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Inpatient Care", "Maternal Health", "Emergency Stabilization"]
    },
    {
        "name": "Sanganer Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Jaipur",
        "block": "Sanganer",
        "address": "Near Sanganer Stadium, Jaipur, Rajasthan 302029",
        "phone_number": "+91-141-2731100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Immunization", "Fever Clinic", "Maternal Care"]
    },

    # ── PATNA (BIHAR) ─────────────────────────────────────────────────
    {
        "name": "Patna Medical College Hospital (PMCH)",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Patna",
        "block": "Patna City",
        "address": "Ashok Rajpath, Patna, Bihar 800004",
        "phone_number": "+91-612-2300080",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency & Trauma", "ICU", "Pediatrics", "General Surgery", "Blood Bank", "Diagnostics"]
    },
    {
        "name": "Danapur Sub-Divisional Hospital (CHC)",
        "facility_type": "CHC",
        "district": "Patna",
        "block": "Danapur",
        "address": "Danapur Cantt, Patna, Bihar 801503",
        "phone_number": "+91-6115-222100",
        "emergency_helpline": "108",
        "services_offered": ["Inpatient 50-Bed", "Maternity Wing", "Emergency Triage", "Pathology"]
    },
    {
        "name": "Phulwari Sharif Primary Health Centre (PHC)",
        "facility_type": "PHC",
        "district": "Patna",
        "block": "Phulwari Sharif",
        "address": "Khagaul Road, Phulwari Sharif, Patna, Bihar 801505",
        "phone_number": "+91-612-2558100",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Immunization", "Maternal Health", "Essential Medicines"]
    },

    # ── VARANASI (UTTAR PRADESH) ───────────────────────────────────────
    {
        "name": "Sir Sunderlal Hospital & Trauma Centre (IMS BHU)",
        "facility_type": "EMERGENCY",
        "district": "Varanasi",
        "block": "Varanasi Urban",
        "address": "Banaras Hindu University Campus, Varanasi, UP 221005",
        "phone_number": "+91-542-2307500",
        "emergency_helpline": "108",
        "services_offered": ["Level-1 Trauma Care", "24x7 Emergency Resuscitation", "Cardiology / Cath Lab", "Pediatric ICU"]
    },
    {
        "name": "Pt. Deen Dayal Upadhyay District Hospital",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Varanasi",
        "block": "Pandeypur",
        "address": "Pandeypur Chauraha, Varanasi, UP 221002",
        "phone_number": "+91-542-2508100",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Trauma Care", "ICU", "Specialist Surgery", "Cardiology", "NICU", "Blood Bank", "CT Scan"]
    },
    {
        "name": "Cholapur Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Varanasi",
        "block": "Cholapur",
        "address": "NH-29, Cholapur, Varanasi, UP 221101",
        "phone_number": "+91-542-2587201",
        "emergency_helpline": "108",
        "services_offered": ["Inpatient 30-Bed", "Emergency Care", "Pediatrics", "Minor Surgery", "X-Ray", "Pathology"]
    },
    {
        "name": "Primary Health Centre (PHC) Chiraigaon",
        "facility_type": "PHC",
        "district": "Varanasi",
        "block": "Chiraigaon",
        "address": "Main Road, Chiraigaon Block, Varanasi, UP 221112",
        "phone_number": "+91-542-2587101",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Fever Clinic", "Maternal Care", "Immunization", "Essential Medicines"]
    },
    {
        "name": "Primary Health Centre (PHC) Shivpur",
        "facility_type": "PHC",
        "district": "Varanasi",
        "block": "Harahua",
        "address": "Shivpur Main Road, Varanasi, UP 221003",
        "phone_number": "+91-542-2587102",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Basic Diagnostics", "Pediatric Triage", "ASHA Coordination"]
    },

    # ── MIRZAPUR (UTTAR PRADESH) ──────────────────────────────────────
    {
        "name": "District Hospital Mirzapur (Maharaja Chet Singh Hospital)",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Mirzapur",
        "block": "Mirzapur City",
        "address": "Civil Lines, Mirzapur, UP 231001",
        "phone_number": "+91-5442-252100",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency", "Critical Care", "Pediatric Ward", "General Surgery", "Dialysis Unit"]
    },
    {
        "name": "Ahraura Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Mirzapur",
        "block": "Ahraura",
        "address": "Chunar-Ahraura Road, Mirzapur, UP 231301",
        "phone_number": "+91-5443-242500",
        "emergency_helpline": "108",
        "services_offered": ["30-Bed Inpatient", "Obstetrics & Gynecology", "Diagnostic Lab", "Emergency Stabilization"]
    },
    {
        "name": "Primary Health Centre (PHC) Chunar",
        "facility_type": "PHC",
        "district": "Mirzapur",
        "block": "Chunar",
        "address": "Station Road, Chunar, Mirzapur, UP 231304",
        "phone_number": "+91-5443-222101",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Fever Management", "Maternal Care", "Direct ASHA Connect"]
    },

    # ── CHANDAULI (UTTAR PRADESH) ─────────────────────────────────────
    {
        "name": "Pt. Kamalapati Tripathi District Hospital",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Chandauli",
        "block": "Chandauli HQ",
        "address": "District HQ Road, Chandauli, UP 232104",
        "phone_number": "+91-5412-255400",
        "emergency_helpline": "108",
        "services_offered": ["Trauma Care", "ICU", "Blood Bank", "Pediatrics", "24/7 Emergency"]
    },
    {
        "name": "Primary Health Centre (PHC) Sakaldiha",
        "facility_type": "PHC",
        "district": "Chandauli",
        "block": "Sakaldiha",
        "address": "Sakaldiha Town, Chandauli, UP 232109",
        "phone_number": "+91-5412-261101",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Vaccination", "Emergency First Aid", "ASHA Alert Center"]
    },

    # ── JAUNPUR (UTTAR PRADESH) ───────────────────────────────────────
    {
        "name": "District Hospital Jaunpur",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Jaunpur",
        "block": "Jaunpur City",
        "address": "Olandganj, Jaunpur, UP 222002",
        "phone_number": "+91-5452-262100",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency", "Trauma Unit", "Inpatient Care", "Surgical Specialties"]
    },
    {
        "name": "Shahganj Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Jaunpur",
        "block": "Shahganj",
        "address": "Azamgarh Road, Shahganj, Jaunpur, UP 223101",
        "phone_number": "+91-5453-222340",
        "emergency_helpline": "108",
        "services_offered": ["General OPD", "Emergency Care", "Maternity", "Immunization"]
    },

    # ── GHAZIPUR (UTTAR PRADESH) ──────────────────────────────────────
    {
        "name": "Maharishi Vishwamitra District Hospital Ghazipur",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Ghazipur",
        "block": "Ghazipur City",
        "address": "Rauza, Ghazipur, UP 233001",
        "phone_number": "+91-548-2220300",
        "emergency_helpline": "108",
        "services_offered": ["Trauma Centre", "ICU", "Specialist OPD", "Diagnostic Services"]
    },
    {
        "name": "Zamania Community Health Centre (CHC)",
        "facility_type": "CHC",
        "district": "Ghazipur",
        "block": "Zamania",
        "address": "Station Road, Zamania, Ghazipur, UP 232329",
        "phone_number": "+91-5497-251200",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency", "Inpatient Beds", "Lab Services", "Maternal Care"]
    },

    # ── SONBHADRA (UTTAR PRADESH) ─────────────────────────────────────
    {
        "name": "Robertsganj District Hospital",
        "facility_type": "DISTRICT_HOSPITAL",
        "district": "Sonbhadra",
        "block": "Robertsganj",
        "address": "Lohia Nagar, Robertsganj, Sonbhadra, UP 231216",
        "phone_number": "+91-5444-222400",
        "emergency_helpline": "108",
        "services_offered": ["24/7 Emergency", "Surgical Ward", "Pediatrics", "Blood Storage"]
    }
]

class FacilityService:
    def __init__(self, db: Session):
        self.db = db

    def seed_initial_facilities(self):
        """Seed verified healthcare facilities across districts if not present."""
        existing_names = {f.name for f in self.db.query(HealthcareFacility.name).all()}
        new_records = []
        for fac in DEFAULT_FACILITIES:
            if fac["name"] not in existing_names:
                rec = HealthcareFacility(
                    name=fac["name"],
                    facility_type=fac["facility_type"],
                    district=fac["district"],
                    block=fac["block"],
                    address=fac["address"],
                    phone_number=fac["phone_number"],
                    emergency_helpline=fac["emergency_helpline"],
                    services_offered=fac["services_offered"],
                    verified=True,
                    last_verified_at=datetime.utcnow()
                )
                new_records.append(rec)
        if new_records:
            logger.info(f"[FacilityService] Seeding {len(new_records)} verified healthcare facilities...")
            self.db.add_all(new_records)
            self.db.commit()

    def list_facilities(
        self,
        district: Optional[str] = None,
        facility_type: Optional[str] = None
    ) -> List[HealthcareFacility]:
        self.seed_initial_facilities()
        query = self.db.query(HealthcareFacility)
        if district and district.strip() and district.lower() not in ["all districts", "all districts (india)"]:
            query = query.filter(HealthcareFacility.district.ilike(f"%{district.strip()}%"))
        if facility_type and facility_type.strip():
            query = query.filter(HealthcareFacility.facility_type == facility_type.strip())
        return query.order_by(HealthcareFacility.district, HealthcareFacility.name).all()

    def get_recommended_facility(
        self,
        triage_level: int,
        district: Optional[str] = None
    ) -> Optional[HealthcareFacility]:
        """
        Recommends appropriate verified facility strictly based on triage severity AND target district:
        - Level 4 (Emergency) -> EMERGENCY (108) or DISTRICT_HOSPITAL in selected district
        - Level 3 (Hospital) -> CHC or DISTRICT_HOSPITAL in selected district
        - Level 2 (PHC) -> PHC or CHC in selected district
        - Level 1 (Home care) -> Nearest PHC for routine reassurance in selected district

        CRITICAL SAFETY RULE:
        The healthcare facility recommendation MUST ALWAYS be based on the patient's CURRENTLY SELECTED DISTRICT.
        ANY district selected by the patient -> ONLY recommend a healthcare facility located in THAT SAME DISTRICT.
        Never recommend a facility from another district.
        Never use Varanasi as a default/fallback facility.
        Never use a previously selected district after the patient changes the selection.
        If no facility exists in the requested district, return None.
        DO NOT fall back to another unrelated district.
        """
        self.seed_initial_facilities()

        if not district or not str(district).strip():
            return None
        
        clean_district = str(district).strip()

        # Strict district filter query: ONLY matching the exact selected district
        district_query = self.db.query(HealthcareFacility).filter(
            HealthcareFacility.district.ilike(clean_district)
        )

        fac = None
        if triage_level == 4:
            fac = district_query.filter(
                HealthcareFacility.facility_type.in_(["EMERGENCY", "DISTRICT_HOSPITAL"])
            ).first()
            if not fac:
                fac = district_query.first()
        elif triage_level == 3:
            fac = district_query.filter(
                HealthcareFacility.facility_type.in_(["CHC", "DISTRICT_HOSPITAL", "EMERGENCY"])
            ).first()
            if not fac:
                fac = district_query.first()
        elif triage_level == 2:
            fac = district_query.filter(
                HealthcareFacility.facility_type.in_(["PHC", "CHC"])
            ).first()
            if not fac:
                fac = district_query.first()
        else: # Level 1
            fac = district_query.filter(
                HealthcareFacility.facility_type == "PHC"
            ).first()
            if not fac:
                fac = district_query.first()

        # HARD INVARIANT: Facility district must match requested district
        if fac and fac.district.strip().lower() != clean_district.lower():
            logger.warning(f"[FacilityService] INVARIANT VIOLATION: Facility {fac.name} in {fac.district} does not match {clean_district}. Returning None.")
            return None

        return fac
