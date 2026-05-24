from .base import LiveSourcePlugin


class GenericStreamProvider(LiveSourcePlugin):
    provider_id = "generic-stream"
    display_name = "User Added Generic Streams"
    source_type = "generic_stream"
    requires_api_key = False
    terms_url = "local://argos/streams"
    min_refresh_seconds = 15
    rate_limit_policy = {"min_refresh_seconds": 15, "notes": "User-owned or public URLs only."}
