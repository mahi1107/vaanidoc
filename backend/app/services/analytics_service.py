from datetime import datetime, date, timedelta, timezone
import zoneinfo
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, distinct
from backend.app.models import CallSession, Patient, TriageResult, SymptomRecord, Alert, FollowUp, AshaWorker, HealthcareFacility
from backend.app.languages.definitions import SUPPORTED_LANGUAGES_REGISTRY

class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def _get_today_start(self) -> datetime:
        # Calculate midnight start in Asia/Kolkata (IST)
        try:
            ist_tz = zoneinfo.ZoneInfo("Asia/Kolkata")
            now_ist = datetime.now(ist_tz)
            midnight_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
            return midnight_ist.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            return datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    def get_overview_metrics(
        self,
        district: Optional[str] = None,
        exclude_demo: bool = False,
        days: Optional[int] = None
    ) -> Dict[str, Any]:
        today_start = self._get_today_start()
        
        call_q = self.db.query(CallSession)
        triage_q = self.db.query(TriageResult).join(TriageResult.call_session)
        followup_q = self.db.query(FollowUp).join(FollowUp.call_session)
        alert_q = self.db.query(Alert).join(Alert.call_session)
        patient_q = self.db.query(func.count(distinct(CallSession.patient_id))).join(CallSession.patient).filter(
            CallSession.patient_id.isnot(None)
        )

        if exclude_demo:
            call_q = call_q.filter(CallSession.is_demo == False)
            triage_q = triage_q.filter(CallSession.is_demo == False)
            followup_q = followup_q.filter(CallSession.is_demo == False)
            alert_q = alert_q.filter(CallSession.is_demo == False)
            patient_q = patient_q.filter(CallSession.is_demo == False)

        if district:
            call_q = call_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            triage_q = triage_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            followup_q = followup_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            alert_q = alert_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            patient_q = patient_q.filter(Patient.district.ilike(f"%{district}%"))

        if days:
            start_dt = datetime.utcnow() - timedelta(days=days)
            patient_q = patient_q.filter(CallSession.started_at >= start_dt)

        total_calls = call_q.count()
        calls_today = call_q.filter(CallSession.started_at >= today_start).count()
        active_cases = call_q.filter(CallSession.status.in_(["active", "in_progress", "escalated"])).count()
        unique_patients = patient_q.scalar() or 0
        
        emergency_cases = triage_q.filter(TriageResult.level == 4).count()
        hospital_referrals = triage_q.filter(TriageResult.level == 3).count()
        phc_referrals = triage_q.filter(TriageResult.level == 2).count()
        home_care_cases = triage_q.filter(TriageResult.level == 1).count()
        
        followups_pending = followup_q.filter(FollowUp.status.in_(["scheduled", "pending"])).count()
        asha_alerts_sent = alert_q.count()

        return {
            "total_calls": total_calls,
            "calls_today": calls_today,
            "active_cases": active_cases,
            "unique_patients": unique_patients,
            "emergency_cases": emergency_cases,
            "hospital_referrals": hospital_referrals,
            "phc_referrals": phc_referrals,
            "home_care_cases": home_care_cases,
            "followups_pending": followups_pending,
            "asha_alerts_sent": asha_alerts_sent
        }

    def get_triage_distribution(self, district: Optional[str] = None, exclude_demo: bool = False) -> List[Dict[str, Any]]:
        triage_q = self.db.query(TriageResult).join(TriageResult.call_session)
        if exclude_demo:
            triage_q = triage_q.filter(CallSession.is_demo == False)
        if district:
            triage_q = triage_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        total = triage_q.count() or 1
        
        levels_config = [
            {"level": 1, "name": "Level 1 — Home Care", "category": "home_care", "color": "#10B981"},
            {"level": 2, "name": "Level 2 — PHC Visit", "category": "phc", "color": "#3B82F6"},
            {"level": 3, "name": "Level 3 — Hospital / CHC", "category": "hospital", "color": "#F59E0B"},
            {"level": 4, "name": "Level 4 — Emergency", "category": "emergency", "color": "#EF4444"}
        ]

        result = []
        for cfg in levels_config:
            count = triage_q.filter(TriageResult.level == cfg["level"]).count()
            pct = round((count / total) * 100, 1)
            result.append({
                "level": cfg["level"],
                "name": cfg["name"],
                "category": cfg["category"],
                "count": count,
                "percentage": pct,
                "color": cfg["color"]
            })
        return result

    def get_symptom_trends(self, district: Optional[str] = None, exclude_demo: bool = False) -> List[Dict[str, Any]]:
        sym_q = self.db.query(SymptomRecord).join(SymptomRecord.call_session).filter(SymptomRecord.is_negated == False)
        if exclude_demo:
            sym_q = sym_q.filter(CallSession.is_demo == False)
        if district:
            sym_q = sym_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        total_syms = sym_q.count() or 1
        
        records = (
            self.db.query(
                SymptomRecord.symptom_name,
                SymptomRecord.hindi_term,
                func.count(SymptomRecord.id).label("count")
            )
            .join(SymptomRecord.call_session)
            .filter(SymptomRecord.is_negated == False)
        )
        if exclude_demo:
            records = records.filter(CallSession.is_demo == False)
        if district:
            records = records.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        records = records.group_by(SymptomRecord.symptom_name, SymptomRecord.hindi_term).order_by(desc("count")).limit(8).all()

        trends = []
        for r in records:
            trends.append({
                "symptom": r.symptom_name,
                "hindi_name": r.hindi_term or r.symptom_name,
                "count": r.count,
                "percentage": round((r.count / total_syms) * 100, 1)
            })
        return trends

    def get_language_distribution(self, district: Optional[str] = None, exclude_demo: bool = False) -> List[Dict[str, Any]]:
        q = self.db.query(CallSession)
        if exclude_demo:
            q = q.filter(CallSession.is_demo == False)
        if district:
            q = q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
        total = q.count() or 1

        records = (
            self.db.query(CallSession.language, func.count(CallSession.id).label("count"))
        )
        if exclude_demo:
            records = records.filter(CallSession.is_demo == False)
        if district:
            records = records.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
        records = records.group_by(CallSession.language).order_by(desc("count")).all()
        
        res = []
        for r in records:
            cfg = SUPPORTED_LANGUAGES_REGISTRY.get(r.language)
            res.append({
                "code": r.language,
                "name": cfg.name_english if cfg else r.language,
                "native_name": cfg.name_native if cfg else r.language,
                "count": r.count,
                "percentage": round((r.count / total) * 100, 1)
            })
        return res

    def get_calls_timeline(self, days: int = 7, district: Optional[str] = None, exclude_demo: bool = False) -> List[Dict[str, Any]]:
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days - 1)

        timeline = []
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            dt_start = datetime.combine(current_date, datetime.min.time())
            dt_end = datetime.combine(current_date, datetime.max.time())

            cq = self.db.query(CallSession).filter(CallSession.started_at.between(dt_start, dt_end))
            tq = self.db.query(TriageResult).join(TriageResult.call_session).filter(TriageResult.created_at.between(dt_start, dt_end))

            if exclude_demo:
                cq = cq.filter(CallSession.is_demo == False)
                tq = tq.filter(CallSession.is_demo == False)

            if district:
                cq = cq.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
                tq = tq.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

            total = cq.count()
            l4 = tq.filter(TriageResult.level == 4).count()
            l3 = tq.filter(TriageResult.level == 3).count()
            l2 = tq.filter(TriageResult.level == 2).count()
            l1 = tq.filter(TriageResult.level == 1).count()

            timeline.append({
                "date": current_date.strftime("%b %d"),
                "total": total,
                "emergency": l4,
                "hospital": l3,
                "phc": l2,
                "home_care": l1
            })
        return timeline

    def get_district_metrics(self, exclude_demo: bool = False) -> List[Dict[str, Any]]:
        # Dynamically discover all configured/available districts in the database
        p_dist = [d[0] for d in self.db.query(Patient.district).distinct() if d[0]]
        f_dist = [d[0] for d in self.db.query(HealthcareFacility.district).distinct() if d[0]]
        a_dist = [d[0] for d in self.db.query(AshaWorker.district).distinct() if d[0]]
        districts = sorted(list(set(p_dist + f_dist + a_dist)))
        result = []
        
        for d in districts:
            cq = self.db.query(CallSession).join(CallSession.patient).filter(Patient.district.ilike(d))
            tq = self.db.query(TriageResult).join(TriageResult.call_session).join(CallSession.patient).filter(Patient.district.ilike(d))
            sq = self.db.query(
                SymptomRecord.symptom_name,
                SymptomRecord.hindi_term,
                func.count(SymptomRecord.id).label("cnt")
            ).join(SymptomRecord.call_session).join(CallSession.patient).filter(
                Patient.district.ilike(d),
                SymptomRecord.is_negated == False
            )

            if exclude_demo:
                cq = cq.filter(CallSession.is_demo == False)
                tq = tq.filter(CallSession.is_demo == False)
                sq = sq.filter(CallSession.is_demo == False)

            calls = cq.count()
            emg = tq.filter(TriageResult.level == 4).count()
            phc_hosp = tq.filter(TriageResult.level.in_([2, 3])).count()
            asha_count = self.db.query(AshaWorker).filter(AshaWorker.district.ilike(d), AshaWorker.is_active == True).count()

            top_sym_row = sq.group_by(SymptomRecord.symptom_name, SymptomRecord.hindi_term).order_by(desc("cnt")).first()
            if top_sym_row:
                top_sym = f"{top_sym_row.hindi_term} / {top_sym_row.symptom_name}" if top_sym_row.hindi_term else top_sym_row.symptom_name
            else:
                top_sym = "—"

            result.append({
                "district": d,
                "total_calls": calls,
                "emergency_cases": emg,
                "phc_hospital_cases": phc_hosp,
                "top_symptom": top_sym,
                "active_asha_count": asha_count
            })
        return result

    def get_today_overview(self, district: Optional[str] = None, exclude_demo: bool = False) -> Dict[str, Any]:
        """Focused today-only metrics for the Overview page."""
        today_start = self._get_today_start()

        call_q = self.db.query(CallSession)
        if exclude_demo:
            call_q = call_q.filter(CallSession.is_demo == False)
        if district:
            call_q = call_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        calls_today = call_q.filter(CallSession.started_at >= today_start).count()
        active_calls = call_q.filter(CallSession.status.in_(["active", "in_progress"])).count()
        active_cases = call_q.filter(CallSession.status.in_(["active", "in_progress", "escalated"])).count()

        tq = self.db.query(TriageResult).join(TriageResult.call_session).filter(TriageResult.created_at >= today_start)
        aq = self.db.query(Alert).join(Alert.call_session)
        fq = self.db.query(FollowUp).join(FollowUp.call_session)

        if exclude_demo:
            tq = tq.filter(CallSession.is_demo == False)
            aq = aq.filter(CallSession.is_demo == False)
            fq = fq.filter(CallSession.is_demo == False)

        if district:
            tq = tq.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            aq = aq.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
            fq = fq.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        emergency_today = tq.filter(TriageResult.level == 4).count()
        hospital_today = tq.filter(TriageResult.level == 3).count()
        phc_today = tq.filter(TriageResult.level == 2).count()
        home_today = tq.filter(TriageResult.level == 1).count()

        unack_alerts = aq.filter(Alert.status.in_(["sent", "pending"])).count()
        followups_due = fq.filter(FollowUp.status.in_(["scheduled", "due"]), FollowUp.scheduled_for <= datetime.utcnow()).count()

        # Urgent cases: emergency or hospital triage from last 24h not yet completed
        urgent_calls = (
            self.db.query(CallSession)
            .join(CallSession.triage_results)
            .filter(
                TriageResult.level >= 3,
                CallSession.started_at >= today_start
            )
        )
        if exclude_demo:
            urgent_calls = urgent_calls.filter(CallSession.is_demo == False)
        if district:
            urgent_calls = urgent_calls.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))

        urgent_list = []
        for call in urgent_calls.limit(10).all():
            tr = call.triage_results[0] if call.triage_results else None
            urgent_list.append({
                "call_id": call.id,
                "call_id_short": call.id[-6:].upper(),
                "started_at": call.started_at.isoformat() + "Z",
                "district": call.patient.district if call.patient else "—",
                "triage_level": tr.level if tr else None,
                "triage_category": tr.category if tr else None,
                "status": call.status,
                "language": call.language,
            })

        # Recent activity (last 8 completed calls)
        recent_calls_q = self.db.query(CallSession).filter(CallSession.status == "completed").order_by(desc(CallSession.ended_at))
        if exclude_demo:
            recent_calls_q = recent_calls_q.filter(CallSession.is_demo == False)
        if district:
            recent_calls_q = recent_calls_q.join(CallSession.patient).filter(Patient.district.ilike(f"%{district}%"))
        recent_calls_rows = recent_calls_q.limit(8).all()
        recent_activity = []
        for call in recent_calls_rows:
            tr = call.triage_results[0] if call.triage_results else None
            recent_activity.append({
                "call_id": call.id,
                "call_id_short": call.id[-6:].upper(),
                "ended_at": call.ended_at.isoformat() + "Z" if call.ended_at else None,
                "district": call.patient.district if call.patient else "—",
                "triage_level": tr.level if tr else None,
                "triage_category": tr.category if tr else None,
                "language": call.language,
                "duration_seconds": call.duration_seconds,
            })

        return {
            "calls_today": calls_today,
            "active_calls": active_calls,
            "active_cases": active_cases,
            "emergency_today": emergency_today,
            "hospital_today": hospital_today,
            "phc_today": phc_today,
            "home_today": home_today,
            "unacknowledged_alerts": unack_alerts,
            "followups_due": followups_due,
            "urgent_cases": urgent_list,
            "recent_activity": recent_activity,
        }
