from .base import LiveSourcePlugin


class WifiPresencePlaceholderProvider(LiveSourcePlugin):
    provider_id = "wifi-presence-placeholder"
    display_name = "RF/WiFi Presence Placeholder"
    source_type = "rf_presence"
    requires_api_key = False
    terms_url = "local://argos/rf-placeholder"
    min_refresh_seconds = 60

    async def healthcheck(self) -> dict:
        health = await super().healthcheck()
        health.update({
            "status": "degraded",
            "message": "Architecture placeholder only: occupancy, density, flow, dwell time, and sensor health. No identity tracking.",
        })
        return health
