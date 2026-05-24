import type { StreamProtocol } from "./types";

export function browserPlaybackMode(protocol: StreamProtocol): "native" | "iframe" | "source_page" | "external" {
    if (protocol === "hls" || protocol === "mjpeg" || protocol === "snapshot") return "native";
    if (protocol === "youtube" || protocol === "iframe") return "iframe";
    if (protocol === "rtsp" || protocol === "rtmp" || protocol === "onvif" || protocol === "webrtc" || protocol === "vlc") return "external";
    return "source_page";
}

export function protocolLabel(protocol: StreamProtocol): string {
    return protocol.toUpperCase();
}
