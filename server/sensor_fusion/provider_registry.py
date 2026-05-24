from __future__ import annotations

from server.plugins.live_sources import PROVIDERS


def list_providers():
    return PROVIDERS


def get_provider(provider_id: str):
    return next((provider for provider in PROVIDERS if provider.provider_id == provider_id), None)
