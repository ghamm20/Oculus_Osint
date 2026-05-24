from .base import LiveSourcePlugin


class FloridaFirefightersProvider(LiveSourcePlugin):
    provider_id = "flfirefighters"
    display_name = "Florida Firefighters Public Feeds"
    source_type = "audio"
    requires_api_key = False
    terms_url = "https://mcfrlive.com/"
