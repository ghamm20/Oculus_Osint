from .entity_store import entity_store
from .event_bus import sensor_event_bus
from .provider_registry import list_providers


class NrtScheduler:
    def __init__(self) -> None:
        self.providers = list_providers()
        self.running = False

    async def refresh_once(self) -> None:
        for provider in self.providers:
            entities = await provider.fetch_updates(None)
            for event in entity_store.upsert_many(entities):
                sensor_event_bus.publish(event)

    def start(self) -> None:
        self.running = True

    def stop(self) -> None:
        self.running = False


nrt_scheduler = NrtScheduler()
