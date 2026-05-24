import { type NextRequest } from "next/server";
import { getSensorScheduler, sensorEventBus } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let unsubscribe: (() => void) | null = null;
    const send = async (payload: unknown) => {
        try {
            await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
            if (heartbeat) clearInterval(heartbeat);
            unsubscribe?.();
        }
    };

    void send({
        type: "connected",
        created_at: new Date().toISOString(),
        payload: {
            entities: scheduler.getEntities().length,
            providers: scheduler.getHealth().length,
        },
    });

    unsubscribe = sensorEventBus.subscribe((event) => {
        void send(event);
    });
    heartbeat = setInterval(() => {
        void send({
            type: "heartbeat",
            created_at: new Date().toISOString(),
            payload: {
                entities: scheduler.getEntities().length,
                provider_health: scheduler.getHealth().length,
            },
        });
    }, 15_000);

    req.signal.addEventListener("abort", () => {
        if (heartbeat) clearInterval(heartbeat);
        unsubscribe?.();
        void writer.close();
    });

    return new Response(stream.readable, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
