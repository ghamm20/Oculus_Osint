import { fetchTnSmartWayCameras } from "../tnsmartway/tnSmartWayFetcher";
import type { CameraAdapter } from "./types";

export const tnSmartWayAdapter: CameraAdapter = {
    id: "tn-smartway",
    displayName: "TDOT SmartWay (Tennessee)",
    region: "United States - Tennessee",
    country: "United States",
    state: "TN",
    priority: "initial",
    cacheTtlMs: 5 * 60 * 1000,
    fetch: fetchTnSmartWayCameras,
};
