from .base import LiveSourcePlugin


class AircraftAdsbProvider(LiveSourcePlugin):
    provider_id = "aircraft-adsb"
    display_name = "Aircraft ADS-B"
    source_type = "adsb"
    requires_api_key = False
    terms_url = "https://opensky-network.org/"
    min_refresh_seconds = 15
