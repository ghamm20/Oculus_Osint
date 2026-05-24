from .stream_schema import EvidenceEntity, utc_now


def build_operator_brief(entities: list[EvidenceEntity], mode: str = "global-awareness") -> dict:
    top = entities[:3]
    return {
        "generated_at": utc_now(),
        "mode": mode,
        "top_items": [{
            "title": entity.title,
            "summary": f"{entity.source_type} evidence from {entity.provider}.",
            "why_it_matters": "Visible public evidence stream in the active operating picture.",
            "confidence": entity.confidence,
            "severity": entity.severity or "info",
            "supporting_entities": [entity.id],
            "recommended_action": "Verify with source page and provider health.",
        } for entity in top],
        "source_health_summary": {},
        "stale_data_warning": None,
    }
