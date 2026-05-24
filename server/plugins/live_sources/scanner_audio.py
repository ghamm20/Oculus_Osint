from .base import LiveSourcePlugin


class ScannerAudioProvider(LiveSourcePlugin):
    provider_id = "scanner-audio"
    display_name = "Public Scanner Audio Catalog"
    source_type = "audio"
    requires_api_key = True
    terms_url = "https://support.broadcastify.com/hc/en-us/articles/204740425-Live-Audio-Feed-Catalog-API"
    min_refresh_seconds = 300

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "api_required",
            "message": "Scanner audio catalogs require approved public API access; live audio is source-page handoff only.",
        })
        return health
