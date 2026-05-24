import { fetchFl511PublicCameras } from "../fl511Public/fl511PublicFetcher";
import type { CameraAdapter } from "./types";

export const fl511PublicAdapter: CameraAdapter = {
    id: "fl511-public",
    displayName: "FL511 Public ArcGIS (Florida)",
    region: "United States - Florida",
    country: "United States",
    state: "FL",
    priority: "initial",
    cacheTtlMs: 10 * 60 * 1000,
    fetch: fetchFl511PublicCameras,
};
