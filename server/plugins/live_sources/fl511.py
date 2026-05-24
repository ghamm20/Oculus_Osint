from .base import LiveSourcePlugin


class FL511Provider(LiveSourcePlugin):
    provider_id = "fl511-public"
    display_name = "FL511 Public CCTV"
    source_type = "traffic_camera"
    requires_api_key = False
    terms_url = "https://fl511.com/"
