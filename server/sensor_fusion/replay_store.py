from .stream_schema import SensorEvent


class ReplayStore:
    def __init__(self) -> None:
        self.updates: list[dict] = []

    def record(self, event: SensorEvent, entity: dict | None = None) -> None:
        self.updates.append({"event": event.__dict__, "entity": entity, "recorded_at": event.created_at})
        self.updates = self.updates[-50000:]

    def query(self) -> list[dict]:
        return list(self.updates)


replay_store = ReplayStore()
