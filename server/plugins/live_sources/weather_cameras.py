from .base import LiveSourcePlugin


class WeatherCamerasProvider(LiveSourcePlugin):
    provider_id = "weather-cameras"
    display_name = "Weather Cameras"
    source_type = "webcam"
    requires_api_key = False
    terms_url = "https://weathercams.faa.gov/cameras"
    min_refresh_seconds = 120
