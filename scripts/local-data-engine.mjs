// scripts/local-data-engine.mjs
// Phase 4 — local data engine stub.
//
// Replaces upstream wss://dataengine.worldwideview.dev with a same-host
// shim on http://localhost:5000. Speaks the wire protocol the upstream
// engine uses (per src/core/data/WsClient.ts + resolveEngineUrl.ts +
// engineManifest.ts) so the existing app/plugin code reaches it without
// any client-side changes.
//
// The stub doesn't host third-party seeders. It translates Oculus's
// own /api/{pluginId} GeoJSON endpoints into the {items: [...]} array
// shape the marketplace plugins expect.
//
// Run with: node scripts/local-data-engine.mjs
// (auto-started by launch-oculus0osint.ps1 if not already listening)

import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WWV_DATA_ENGINE_PORT || 5000);
const OCULUS_BASE_URL = (
    process.env.OCULUS_BASE_URL || "http://127.0.0.1:3010"
).replace(/\/+$/, "");
const POLL_INTERVAL_MS = Number(process.env.WWV_ENGINE_POLL_MS || 30000);

// Plugins this stub knows how to translate. Mirror of DEFAULT_PLUGIN_IDS
// plus the upstream registry's verified set. Plugins not in this list
// still get a manifest entry (so localEngineHasPlugin returns true and
// the resolver routes to localhost) but return {items: []} from the
// translator until a mapping is added.
const KNOWN_PLUGINS = [
    "aviation",
    "maritime",
    "military-aviation",
    "wildfire",
    "camera",
    "borders",
    "osm-search",
    "earthquakes",
    "satellite",
    "daynight",
    "conflict-zones",
    "conflict-events",
    "civil-unrest",
    "cyber-attacks",
    "volcanoes",
    "airports",
    "international-sanctions",
    "gps-jamming",
    "fortiguard",
    "nz-traffic-cameras",
    "embassies",
    "military-bases",
    "nuclear-facilities",
    "seaports",
    "lighthouses",
    "spaceports",
    "iranwarlive",
    "undersea-cables",
    "mineral-mines",
    "air-defense",
    "surveillance-satellites",
];

// Map plugin IDs to the Oculus REST endpoint that backs them.
// Several plugins ship a backing endpoint in Oculus's /api tree; the rest
// have no native source and return empty items.
const OCULUS_ENDPOINT = {
    aviation: "/api/aviation",
    wildfire: "/api/wildfire",
    "conflict-zones": "/api/conflict-zones",
    "conflict-events": "/api/conflict-zones", // closest Oculus equivalent
    maritime: "/api/maritime",
    earthquakes: "/api/earthquake",
    volcanoes: "/api/volcanoes",
    airports: "/api/airports",
    satellite: "/api/satellite",
    "undersea-cables": "/api/undersea-cables",
};

// Per-plugin translator: GeoJSON Feature → flat item the plugin expects.
const FEATURE_TO_ITEM = {
    aviation: (f) => ({
        icao24: f.properties?.id,
        callsign: f.properties?.name,
        origin_country: f.properties?.country,
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        altitude: f.properties?.altitude ?? f.geometry?.coordinates?.[2] ?? null,
        heading: f.properties?.heading,
        velocity: f.properties?.velocity,
        on_ground: f.properties?.onGround,
    }),
    wildfire: (f) => ({
        id: f.properties?.id,
        name: f.properties?.name,
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        bright_ti: f.properties?.brightness,
        confidence: f.properties?.confidence,
        acq_date: new Date().toISOString().slice(0, 10),
        acq_time: new Date().toISOString().slice(11, 16).replace(":", ""),
        satellite: "Local",
        frp: f.properties?.brightness ?? 0,
    }),
    maritime: (f) => ({
        mmsi: f.properties?.id,
        name: f.properties?.name,
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        speed: f.properties?.speed,
        heading: f.properties?.heading,
        type: f.properties?.vesselType,
    }),
    "conflict-zones": (f) => ({
        id: f.properties?.id,
        name: f.properties?.name,
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        ...(f.properties || {}),
    }),
    "conflict-events": (f) => ({
        id: f.properties?.id,
        name: f.properties?.name,
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        ...(f.properties || {}),
    }),
    // Default: copy properties + geometry coords as lat/lon. Should be
    // safe for any plugin whose mapper reads standard latitude/longitude.
    _default: (f) => ({
        id: f.properties?.id,
        name: f.properties?.name,
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
        latitude: f.geometry?.coordinates?.[1],
        longitude: f.geometry?.coordinates?.[0],
        ...(f.properties || {}),
    }),
};

async function fetchOculusItems(pluginId) {
    const endpoint = OCULUS_ENDPOINT[pluginId];
    if (!endpoint) return [];
    const url = `${OCULUS_BASE_URL}${endpoint}`;
    try {
        const res = await fetch(url, {
            headers: { "User-Agent": "Oculus0Osint-LocalDataEngine/0.1" },
            signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
            console.warn(`[engine] ${pluginId}: oculus ${endpoint} -> HTTP ${res.status}`);
            return [];
        }
        const json = await res.json();
        const features = Array.isArray(json.features) ? json.features : [];
        const mapper = FEATURE_TO_ITEM[pluginId] || FEATURE_TO_ITEM._default;
        return features.map(mapper);
    } catch (err) {
        console.warn(`[engine] ${pluginId}: fetch failed: ${err.message}`);
        return [];
    }
}

function sendJson(res, status, body) {
    const buf = Buffer.from(JSON.stringify(body));
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": buf.length,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
    });
    res.end(buf);
}

const server = createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        });
        return res.end();
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    if (path === "/manifest") {
        return sendJson(res, 200, { plugins: KNOWN_PLUGINS });
    }
    if (path === "/health") {
        return sendJson(res, 200, { status: "ok", plugins: KNOWN_PLUGINS.length });
    }

    // /api/{pluginId} translator
    const apiMatch = path.match(/^\/api\/([a-zA-Z0-9-]+)$/);
    if (apiMatch) {
        const pluginId = apiMatch[1];
        const items = await fetchOculusItems(pluginId);
        return sendJson(res, 200, { items });
    }

    sendJson(res, 404, { error: `unknown path ${path}` });
});

// ───────────────────────── WebSocket /stream ─────────────────────────
const wss = new WebSocketServer({ noServer: true });
const activeSubs = new Map(); // ws -> Set<pluginId>

server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname !== "/stream") {
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws) => {
    const subs = new Set();
    activeSubs.set(ws, subs);
    ws.send(JSON.stringify({ type: "welcome", plugins: KNOWN_PLUGINS }));

    ws.on("message", async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }
        if (msg.action === "subscribe" && msg.pluginId) {
            subs.add(msg.pluginId);
            const items = await fetchOculusItems(msg.pluginId);
            ws.send(JSON.stringify({
                type: "data",
                pluginId: msg.pluginId,
                payload: items,
            }));
        } else if (msg.action === "unsubscribe" && msg.pluginId) {
            subs.delete(msg.pluginId);
        }
    });

    ws.on("close", () => {
        activeSubs.delete(ws);
    });
});

// Refresh loop — every POLL_INTERVAL_MS, send current data to all subs.
setInterval(async () => {
    for (const [ws, subs] of activeSubs.entries()) {
        if (ws.readyState !== ws.OPEN) continue;
        for (const pluginId of subs) {
            try {
                const items = await fetchOculusItems(pluginId);
                ws.send(JSON.stringify({
                    type: "data",
                    pluginId,
                    payload: items,
                }));
            } catch {
                // ignore — next tick will retry
            }
        }
    }
}, POLL_INTERVAL_MS);

server.listen(PORT, "127.0.0.1", () => {
    console.log(`[engine] listening on http://127.0.0.1:${PORT}`);
    console.log(`[engine] backing oculus at ${OCULUS_BASE_URL}`);
    console.log(`[engine] poll interval ${POLL_INTERVAL_MS}ms`);
    console.log(`[engine] plugins served: ${KNOWN_PLUGINS.length}`);
});
