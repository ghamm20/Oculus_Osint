from .stream_schema import SensorEvent


def build_narrative(events: list[SensorEvent]) -> dict:
    if not events:
        return {"summary": "No recent sensor changes have been recorded.", "events": []}
    latest = events[0]
    return {
        "summary": f"Latest change: {latest.summary} Confidence: {latest.confidence:.2f}.",
        "events": [event.__dict__ for event in events[:20]],
    }
