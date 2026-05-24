from .stream_schema import EvidenceEntity


def trust_score(entity: EvidenceEntity, provider_failed: bool = False) -> float:
    score = entity.trust_score or 0.5
    if entity.legal_status == "approved":
        score += 0.1
    if entity.status == "stale" or entity.freshness_score < 0.2:
        score -= 0.25
    if provider_failed:
        score -= 0.2
    if entity.lat is None or entity.lon is None:
        score -= 0.1
    return max(0.0, min(1.0, score))
