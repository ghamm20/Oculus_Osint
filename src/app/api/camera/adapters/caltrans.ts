import { fetchCaltransCameras } from "../caltrans/caltransFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const caltransAdapter: CameraAdapter = {
    id: "caltrans",
    displayName: "Caltrans (California)",
    region: "United States - California",
    country: "United States",
    state: "CA",
    priority: "expanded",
    fetch: async () => (await fetchCaltransCameras()) as CameraFeature[],
};
