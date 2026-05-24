from .base import LiveSourcePlugin


class BlockedPrivateCameraIndexesProvider(LiveSourcePlugin):
    provider_id = "blocked-private-camera-indexes"
    display_name = "Blocked Private Camera Indexes"
    source_type = "blocked"
    requires_api_key = False
    terms_url = "about:blank"
    min_refresh_seconds = 86400
    rate_limit_policy = {"min_refresh_seconds": 86400, "notes": "Awareness diagnostic only."}

    async def fetch_catalog(self):
        return []

    async def get_live_url(self, item_id: str) -> dict:
        return {
            "item_id": item_id,
            "live_url": None,
            "embed_url": None,
            "source_page_url": None,
            "requires_user_click": True,
            "legal_status": "blocked",
            "diagnostics": {
                "reason": "Unsecured/private camera index; not approved for automated ingestion.",
            },
        }

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "blocked",
            "message": "Unsecured/private camera index; not approved for automated ingestion.",
        })
        return health
