from .stream_schema import EvidenceEntity


def correlate_entities(entities: list[EvidenceEntity]) -> list[dict]:
    if len(entities) < 2:
        return []
    nearby = [entity for entity in entities if entity.lat is not None and entity.lon is not None][:12]
    if len(nearby) < 2:
        return []
    return [{
        "id": "correlation:first-pass",
        "title": "Nearby public sensor activity",
        "summary": f"{len(nearby)} geocoded entities are available for operator review.",
        "entities": [entity.id for entity in nearby],
        "confidence": 0.55,
        "severity": "low",
        "reasoning_summary": "Heuristic first pass groups visible entities with known coordinates.",
        "recommended_action": "Inspect source health and official feeds before acting.",
    }]
