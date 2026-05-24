from .base import LiveSourcePlugin


class BlockedInsecamProvider(LiveSourcePlugin):
    provider_id = "blocked-insecam"
    display_name = "Blocked Insecam Directory"
    source_type = "blocked"
    requires_api_key = False
    terms_url = "https://www.insecam.org/"

    async def get_live_url(self, item_id: str) -> dict:
        return {
            "item_id": item_id,
            "live_url": None,
            "embed_url": None,
            "source_page_url": self.terms_url,
            "requires_user_click": True,
            "legal_status": "blocked",
            "diagnostics": {"reason": "Authorization/privacy boundary. No playable URLs are returned."},
        }
