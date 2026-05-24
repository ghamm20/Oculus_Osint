from .base import LiveSourcePlugin


class MarineAisProvider(LiveSourcePlugin):
    provider_id = "marine-ais"
    display_name = "Marine AIS Pathway"
    source_type = "ais"
    requires_api_key = False
    terms_url = "https://marinecadastre.gov/accessais/"
    min_refresh_seconds = 300

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "unavailable",
            "message": "MarineCadastre AccessAIS is historical/order-based; no real-time AIS stream is configured.",
        })
        return health
