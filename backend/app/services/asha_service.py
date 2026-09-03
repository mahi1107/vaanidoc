from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from backend.app.models import AshaWorker, Alert, CallSession, TriageResult
from backend.app.sms import get_sms_provider, SMSMessage
from backend.app.utils.logger import logger

class AshaService:
    def __init__(self, db: Session):
        self.db = db
        self.sms_provider = get_sms_provider()

    def get_or_create_worker_for_location(self, district: str = "Varanasi", village: str = "Rustampur") -> AshaWorker:
        worker = self.db.query(AshaWorker).filter(
            AshaWorker.district == district,
            AshaWorker.village == village,
            AshaWorker.is_active == True
        ).first()

        if not worker:
            worker = self.db.query(AshaWorker).filter(
                AshaWorker.district == district,
                AshaWorker.is_active == True
            ).first()

        if not worker:
            # Create a default active ASHA worker for this catchment area
            worker = AshaWorker(
                worker_code=f"ASHA-{district[:3].upper()}-01",
                name="सुनीता देवी (Sunita Devi)",
                phone_number="+91-94512-88741",
                state="Uttar Pradesh",
                district=district,
                sub_district="Chiraigaon",
                village=village,
                is_active=True,
                assigned_population=1200
            )
            self.db.add(worker)
            self.db.commit()
            self.db.refresh(worker)

        return worker

    async def trigger_triage_alert(
        self,
        call_session_id: str,
        triage_level: int,
        symptoms_str: str,
        triage_category: str,
        district: str = "Varanasi",
        village: str = "Rustampur"
    ) -> Optional[Alert]:
        """
        Triggers an ASHA alert if triage level is 2 (PHC), 3 (Hospital), or 4 (Emergency).
        """
        if triage_level < 2:
            # Home care doesn't require immediate ASHA escalation
            return None

        worker = self.get_or_create_worker_for_location(district, village)

        level_labels = {
            2: "PHC REFERRAL / प्राथमिक स्वास्थ्य केंद्र",
            3: "HOSPITAL REFERRAL / अस्पताल परामर्श",
            4: "EMERGENCY / आपातकालीन स्थिति"
        }
        level_label = level_labels.get(triage_level, "HEALTH CHECK")

        # Zero sensitive PII in SMS as required by privacy spec
        short_id = call_session_id[-6:].upper()
        sms_text = (
            f"VaaniDoc Alert ({level_label})\n"
            f"Village: {village} ({district})\n"
            f"Triage: Level {triage_level}\n"
            f"Symptoms: {symptoms_str}\n"
            f"Action: Please verify patient status within 24h.\n"
            f"Ref ID: {short_id}"
        )

        alert = Alert(
            call_session_id=call_session_id,
            asha_worker_id=worker.id,
            alert_type="sms",
            triage_level=triage_level,
            message=sms_text,
            status="pending",
            sent_at=datetime.utcnow()
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)

        # Dispatch via SMS Provider
        try:
            sms_res = await self.sms_provider.send_sms(
                SMSMessage(
                    to_number=worker.phone_number,
                    body=sms_text,
                    call_id=call_session_id,
                    triage_level=triage_level,
                    worker_id=worker.id
                )
            )
            if sms_res.success:
                # Only mark delivered if real SMS provider confirmed it
                is_real_delivery = bool(sms_res.message_id and not sms_res.message_id.startswith("MOCK"))
                alert.status = "delivered" if is_real_delivery else "sent"
                alert.sms_sid = sms_res.message_id
                self.db.commit()
        except Exception as e:
            logger.error(f"[AshaService] Failed to send SMS: {e}")

        return alert
