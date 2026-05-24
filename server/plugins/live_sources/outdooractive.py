from .base import LiveSourcePlugin


class OutdooractiveProvider(LiveSourcePlugin):
    provider_id = "outdooractive"
    display_name = "Outdooractive Webcams"
    source_type = "webcam"
    requires_api_key = True
    terms_url = "https://developers.outdooractive.com/API-Reference/Data-API.html"
