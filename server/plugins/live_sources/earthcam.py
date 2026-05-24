from .base import LiveSourcePlugin


class EarthCamProvider(LiveSourcePlugin):
    provider_id = "earthcam"
    display_name = "EarthCam Partner API"
    source_type = "webcam"
    requires_api_key = True
    terms_url = "https://www.earthcam.net/api/"
