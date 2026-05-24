import type { EvidenceEntity, ReplayUpdate, SensorEvent } from "./streamSchema";
import { makeId } from "./diagnostics";

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export class ReplayStore {
    private updates: ReplayUpdate[] = [];

    record(event: SensorEvent, entity: EvidenceEntity | null): ReplayUpdate {
        const update: ReplayUpdate = {
            id: makeId("replay"),
            entity_id: event.entity_id ?? "provider",
            provider: event.provider ?? "system",
            type: event.type,
            recorded_at: event.created_at,
            entity,
            event,
        };
        this.updates.push(update);
        this.trim();
        return update;
    }

    query(params: {
        start?: string | null;
        end?: string | null;
        bbox?: [number, number, number, number];
    } = {}): ReplayUpdate[] {
        const start = params.start ? Date.parse(params.start) : 0;
        const end = params.end ? Date.parse(params.end) : Number.POSITIVE_INFINITY;
        return this.updates.filter((update) => {
            const time = Date.parse(update.recorded_at);
            if (Number.isFinite(start) && time < start) return false;
            if (Number.isFinite(end) && time > end) return false;
            if (params.bbox && update.entity && update.entity.lat !== null && update.entity.lon !== null) {
                const [minLon, minLat, maxLon, maxLat] = params.bbox;
                return update.entity.lon >= minLon
                    && update.entity.lon <= maxLon
                    && update.entity.lat >= minLat
                    && update.entity.lat <= maxLat;
            }
            return true;
        });
    }

    recent(limit = 500): ReplayUpdate[] {
        return this.updates.slice(-limit).reverse();
    }

    private trim(): void {
        const cutoff = Date.now() - MAX_AGE_MS;
        this.updates = this.updates.filter((update) => {
            const time = Date.parse(update.recorded_at);
            return !Number.isFinite(time) || time >= cutoff;
        }).slice(-50_000);
    }
}

export const replayStore = new ReplayStore();
