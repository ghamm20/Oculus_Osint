from .diagnostics import event_from_entity
from .stream_schema import EvidenceEntity, SensorEvent


class EntityStore:
    def __init__(self) -> None:
        self.entities: dict[str, EvidenceEntity] = {}
        self.events: list[SensorEvent] = []

    def upsert_many(self, entities: list[EvidenceEntity]) -> list[SensorEvent]:
        events: list[SensorEvent] = []
        for entity in entities:
            event_type = "entity_updated" if entity.id in self.entities else "entity_created"
            self.entities[entity.id] = entity
            events.append(event_from_entity(event_type, entity, f"{entity.title} {event_type.replace('_', ' ')}."))
        self.events.extend(events)
        self.events = self.events[-5000:]
        return events

    def all(self) -> list[EvidenceEntity]:
        return list(self.entities.values())

    def recent_events(self, limit: int = 200) -> list[SensorEvent]:
        return list(reversed(self.events[-limit:]))


entity_store = EntityStore()
