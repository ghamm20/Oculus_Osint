import { EventEmitter } from "node:events";
import type { SensorEvent } from "./streamSchema";

export class SensorEventBus {
    private emitter = new EventEmitter();

    publish(event: SensorEvent): void {
        this.emitter.emit("event", event);
        this.emitter.emit(event.type, event);
    }

    subscribe(listener: (event: SensorEvent) => void): () => void {
        this.emitter.on("event", listener);
        return () => this.emitter.off("event", listener);
    }
}

export const sensorEventBus = new SensorEventBus();
