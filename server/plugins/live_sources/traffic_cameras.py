from .base import LiveSourcePlugin


class TrafficCamerasProvider(LiveSourcePlugin):
    provider_id = "traffic-cameras"
    display_name = "Public Traffic Cameras"
    source_type = "traffic_camera"
    requires_api_key = False
    terms_url = "https://fl511.com/"
    min_refresh_seconds = 60

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "degraded",
            "message": "Next.js adapters own active DOT ingestion; Python contract is ready for provider expansion.",
        })
        return health
