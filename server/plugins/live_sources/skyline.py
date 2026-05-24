from .base import LiveSourcePlugin


class SkylineProvider(LiveSourcePlugin):
    provider_id = "skyline"
    display_name = "Skyline Webcams"
    source_type = "webcam"
    requires_api_key = False
    terms_url = "https://www.skylinewebcams.com/terms-of-use.html"
