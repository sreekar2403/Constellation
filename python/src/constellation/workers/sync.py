"""Sync worker for incremental data synchronization."""

import asyncio
from datetime import datetime, timezone
from constellation.utils.logger import get_logger

logger = get_logger(__name__)


class SyncWorker:
    """Worker for incremental synchronization of data sources."""

    def __init__(self):
        self._running = False
        self._last_sync: dict[str, datetime] = {}

    async def sync_source(self, source_id: str, config: dict) -> dict:
        """Sync a data source."""
        self._running = True
        start_time = datetime.now(timezone.utc)

        try:
            # TODO: Implement actual sync logic based on source type
            logger.info("sync_started", source_id=source_id)

            # Placeholder sync logic
            await asyncio.sleep(0.1)

            self._last_sync[source_id] = datetime.now(timezone.utc)
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info("sync_completed", source_id=source_id, duration_seconds=duration)

            return {
                "status": "completed",
                "source_id": source_id,
                "duration_seconds": duration,
                "timestamp": self._last_sync[source_id].isoformat(),
            }
        except Exception as e:
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.error("sync_failed", source_id=source_id, error=str(e))
            return {
                "status": "failed",
                "source_id": source_id,
                "error": str(e),
                "duration_seconds": duration,
            }
        finally:
            self._running = False

    def get_last_sync(self, source_id: str) -> datetime | None:
        """Get the last sync time for a source."""
        return self._last_sync.get(source_id)

    def is_running(self) -> bool:
        """Check if sync is currently running."""
        return self._running
