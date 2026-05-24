from .base import LiveSourcePlugin


class WeatherRadarProvider(LiveSourcePlugin):
    provider_id = "weather-radar"
    display_name = "Weather Radar"
    source_type = "weather"
    requires_api_key = False
    terms_url = "https://www.weather.gov/gis/"
    min_refresh_seconds = 120
