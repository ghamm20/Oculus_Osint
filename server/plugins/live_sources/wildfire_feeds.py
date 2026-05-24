from .base import LiveSourcePlugin


class WildfireFeedsProvider(LiveSourcePlugin):
    provider_id = "wildfire-feeds"
    display_name = "Public Wildfire Feeds"
    source_type = "wildfire"
    requires_api_key = False
    terms_url = "https://data-nifc.opendata.arcgis.com/"
    min_refresh_seconds = 120
