from .base import LiveSourcePlugin


class OpenWebcamDbProvider(LiveSourcePlugin):
    provider_id = "openwebcamdb"
    display_name = "OpenWebcamDB"
    source_type = "webcam"
    requires_api_key = True
    terms_url = "https://openwebcamdb.com/api/docs"
