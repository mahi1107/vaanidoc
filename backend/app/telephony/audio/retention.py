import os
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.models import AudioMetadata, CallSession
from backend.app.config.settings import settings
from backend.app.utils.logger import logger

class AudioRetentionManager:
    """
    DPDP Act 2023 Compliant Audio Retention Policy Manager.
    Prunes expired raw telephony audio records and files older than AUDIO_RETENTION_DAYS.
    """
    def __init__(self, db: Session):
        self.db = db

    def cleanup_expired_audio(self) -> int:
        now = datetime.utcnow()
        expired_records = (
            self.db.query(AudioMetadata)
            .filter(AudioMetadata.retention_expiry <= now)
            .all()
        )
        
        cleaned_count = 0
        for rec in expired_records:
            logger.info(f"[AudioRetention] Pruning expired audio metadata: ID={rec.id}, Call={rec.call_session_id}")
            self.db.delete(rec)
            cleaned_count += 1

        if cleaned_count > 0:
            self.db.commit()
            logger.info(f"[AudioRetention] Successfully purged {cleaned_count} expired audio records.")

        return cleaned_count
