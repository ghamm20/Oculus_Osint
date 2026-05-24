from .base import LiveSourcePlugin


class MarineCadastreAisProvider(LiveSourcePlugin):
    provider_id = "marinecadastre-ais"
    display_name = "MarineCadastre AccessAIS"
    source_type = "ais"
    requires_api_key = False
    terms_url = "https://marinecadastre.gov/accessais/"
