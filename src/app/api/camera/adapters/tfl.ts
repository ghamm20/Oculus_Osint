import { fetchTflCameras } from "../tfl/tflFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const tflAdapter: CameraAdapter = {
    id: "tfl",
    displayName: "TfL JamCams (London)",
    region: "United Kingdom - London",
    country: "United Kingdom",
    priority: "expanded",
    fetch: async () => (await fetchTflCameras()) as CameraFeature[],
};
