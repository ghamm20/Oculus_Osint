import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { getSensorProvider } from "@/server/sensorFusion/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const scheduler = getSensorScheduler();
    scheduler.start();
    const entity = scheduler.getEntity(decodeURIComponent(id));
    if (!entity) return NextResponse.json({ error: "Sensor entity not found" }, { status: 404 });
    const provider = getSensorProvider(entity.provider);
    const live = provider ? await provider.get_live_url(entity.source_id) : null;
    return NextResponse.json({
        entity,
        live,
        related_correlations: scheduler.getCorrelations().filter((correlation) => correlation.entities.includes(entity.id)),
        related_anomalies: scheduler.getAnomalies().filter((anomaly) => anomaly.entities.includes(entity.id)),
    });
}
