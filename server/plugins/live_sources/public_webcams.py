from .base import LiveSourcePlugin


class PublicWebcamsProvider(LiveSourcePlugin):
    provider_id = "public-webcams"
    display_name = "Public Webcam Catalogs"
    source_type = "webcam"
    requires_api_key = True
    terms_url = "https://openwebcamdb.com/api/docs"
    min_refresh_seconds = 21600

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "api_required",
            "message": "Public webcam catalogs require provider-specific API keys or approved partner access.",
        })
        return health
