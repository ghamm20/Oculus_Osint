import type { CorrelationObject, OperatorBrief, SensorEvent } from "./streamSchema";

export function buildNarrative(params: {
    events: SensorEvent[];
    correlations: CorrelationObject[];
    brief: OperatorBrief;
    since?: string | null;
}): { generated_at: string; mode: string; narrative: string; timeline: Array<{ time: string; text: string }> } {
    const sinceMs = params.since ? Date.parse(params.since) : 0;
    const relevant = params.events
        .filter((event) => !Number.isFinite(sinceMs) || Date.parse(event.created_at) > sinceMs)
        .slice(0, 20);
    const timeline = relevant.map((event) => ({
        time: event.created_at,
        text: `${event.type.replace(/_/g, " ")}: ${event.summary}`,
    }));
    const top = params.brief.top_items[0];
    const correlationText = params.correlations.length
        ? `${params.correlations.length} heuristic correlations are active.`
        : "No active multi-source correlation is elevated.";
    return {
        generated_at: new Date().toISOString(),
        mode: params.brief.mode,
        narrative: `Over the current window, ARGOS highlights "${top.title}". ${top.summary} ${correlationText} Confidence: ${(top.confidence * 100).toFixed(0)}%. Recommended action: ${top.recommended_action}`,
        timeline,
    };
}
