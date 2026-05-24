from .base import LiveSourcePlugin


class BroadcastifyProvider(LiveSourcePlugin):
    provider_id = "broadcastify"
    display_name = "Broadcastify Live Audio Catalog"
    source_type = "audio"
    requires_api_key = True
    terms_url = "https://support.broadcastify.com/hc/en-us/articles/204740425-Live-Audio-Feed-Catalog-API"
