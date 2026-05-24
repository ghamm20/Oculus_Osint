from .base import LiveSourcePlugin


class EarthquakesProvider(LiveSourcePlugin):
    provider_id = "earthquakes"
    display_name = "USGS Earthquakes"
    source_type = "earthquake"
    requires_api_key = False
    terms_url = "https://earthquake.usgs.gov/earthquakes/feed/"
    min_refresh_seconds = 120
