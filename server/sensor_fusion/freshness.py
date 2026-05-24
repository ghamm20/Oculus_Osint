from datetime import datetime, timezone


def freshness_score(last_seen: str, expected_refresh_seconds: int) -> float:
    try:
        seen = datetime.fromisoformat(last_seen.replace("Z", "+00:00"))
    except ValueError:
        return 0.0
    if seen.tzinfo is None:
        seen = seen.replace(tzinfo=timezone.utc)
    age = max(0.0, (datetime.now(timezone.utc) - seen).total_seconds())
    stale_after = max(1, expected_refresh_seconds) * 3
    return max(0.0, min(1.0, 1.0 - (age / stale_after)))
