from collections.abc import Callable

from .stream_schema import SensorEvent


class SensorEventBus:
    def __init__(self) -> None:
        self._listeners: list[Callable[[SensorEvent], None]] = []

    def publish(self, event: SensorEvent) -> None:
        for listener in list(self._listeners):
            listener(event)

    def subscribe(self, listener: Callable[[SensorEvent], None]) -> Callable[[], None]:
        self._listeners.append(listener)

        def unsubscribe() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return unsubscribe


sensor_event_bus = SensorEventBus()
