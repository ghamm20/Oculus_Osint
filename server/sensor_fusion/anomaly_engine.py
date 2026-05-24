from .stream_schema import EvidenceEntity


def detect_anomalies(entities: list[EvidenceEntity]) -> list[dict]:
    stale = [entity for entity in entities if entity.status == "stale"]
    if not stale:
        return []
    return [{
        "id": "anomaly:stale-cluster",
        "title": "Stale sensor cluster",
        "summary": f"{len(stale)} entities are stale.",
        "entities": [entity.id for entity in stale],
        "severity": "low",
        "confidence": 0.7,
        "rule_id": "heuristic_stale_cluster",
        "heuristic": True,
    }]
