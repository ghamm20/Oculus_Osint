// Phase 3 Gate 3F — opt-in path proof.
// 1. Navigate to /login (cheap), set localStorage.wwv_map_layer = "osm",
//    set the auth cookie via setExtraHTTPHeaders.
// 2. Navigate to / and let the picker render OSM.
// 3. Audit all network requests, write off-site list.
//
// PASS condition: tile.openstreetmap.org appears in off-site.
// This proves the opt-in seam works without rebuilding.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import WebSocket from "ws";

const [, , outArg, cookieFileArg] = process.argv;
if (!outArg) {
    console.error("Usage: node scripts/phase3-gate-3f.mjs <out.txt> [cookieFile]");
    process.exit(2);
}

function findEdge() {
    const candidates = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    return candidates.find((p) => existsSync(p));
}

function parseSessionToken(path) {
    if (!path || !existsSync(path)) return null;
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.includes("authjs.session-token")) continue;
        const cleaned = line.startsWith("#HttpOnly_") ? line.replace("#HttpOnly_", "") : line;
        const parts = cleaned.split("\t").map((p) => p.replace(/\r$/, "").trim());
        if (parts.length < 7) continue;
        return `authjs.session-token=${parts[6]}`;
    }
    return null;
}

const edge = findEdge();
const profileDir = join(tmpdir(), `phase3-edge-${process.pid}`);
mkdirSync(profileDir, { recursive: true });
const debugPort = 9400 + Math.floor(Math.random() * 500);

const child = spawn(edge, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
    "--disable-extensions", "--disable-plugins",
    "--disable-component-extensions-with-background-pages",
    "--no-default-browser-check", "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    "--window-size=1280,800", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });

function cleanup(code) {
    try { child.kill("SIGKILL"); } catch {}
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
    process.exit(code);
}
process.on("SIGINT", () => cleanup(130));
process.on("uncaughtException", (e) => { console.error(e); cleanup(1); });

let nextId = 1;
function cdp(ws, method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
        const id = nextId++;
        const msg = { id, method, params };
        if (sessionId) msg.sessionId = sessionId;
        function onMessage(data) {
            const parsed = JSON.parse(data.toString());
            if (parsed.id === id) {
                ws.off("message", onMessage);
                if (parsed.error) reject(new Error(parsed.error.message));
                else resolve(parsed.result);
            }
        }
        ws.on("message", onMessage);
        ws.send(JSON.stringify(msg));
    });
}

async function discover() {
    for (let i = 0; i < 30; i++) {
        try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) return await r.json(); } catch {}
        await wait(200);
    }
    throw new Error("CDP not up");
}

try {
    const version = await discover();
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });

    const list = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((r) => r.json());
    const page = list.find((t) => t.type === "page");
    const attached = await cdp(ws, "Target.attachToTarget", { targetId: page.id, flatten: true });
    const sessionId = attached.sessionId;

    await cdp(ws, "Page.enable", {}, sessionId);
    await cdp(ws, "Network.enable", {}, sessionId);

    const cookieHeader = parseSessionToken(cookieFileArg);
    if (cookieHeader) {
        await cdp(ws, "Network.setExtraHTTPHeaders", { headers: { Cookie: cookieHeader } }, sessionId);
    }

    // Step 1: navigate to /login, set localStorage there
    const waitLogin = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
                ws.off("message", handler); resolve();
            }
        };
        ws.on("message", handler);
        setTimeout(resolve, 15000);
    });
    await cdp(ws, "Page.navigate", { url: "http://localhost:3010/login" }, sessionId);
    await waitLogin;
    await wait(2000);

    // localStorage on http://localhost:3010 origin
    await cdp(ws, "Runtime.evaluate", {
        expression: `localStorage.setItem("wwv_map_layer","osm"); localStorage.getItem("wwv_map_layer")`,
    }, sessionId);

    // Now start recording network for the second navigation
    const requests = new Map();
    const responses = new Map();
    ws.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.sessionId !== sessionId) return;
        if (msg.method === "Network.requestWillBeSent") {
            const { requestId, request, type, initiator } = msg.params;
            requests.set(requestId, { url: request.url, method: request.method, type, initiator: initiator?.type });
        } else if (msg.method === "Network.responseReceived") {
            const { requestId, response } = msg.params;
            responses.set(requestId, { status: response.status });
        }
    });

    // Step 2: navigate to /, let imagery picker honor localStorage choice
    const waitHome = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
                ws.off("message", handler); resolve();
            }
        };
        ws.on("message", handler);
        setTimeout(resolve, 25000);
    });
    await cdp(ws, "Page.navigate", { url: "http://localhost:3010/" }, sessionId);
    await waitHome;
    await wait(10000); // settle Cesium tile fetches

    // Compose and write the audit
    const all = [];
    for (const [id, req] of requests.entries()) {
        const resp = responses.get(id) || {};
        all.push({ ...req, status: resp.status });
    }
    function isLocal(url) {
        try {
            const u = new URL(url);
            return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.protocol === "data:" || u.protocol === "blob:";
        } catch { return false; }
    }
    const offsite = all.filter((r) => !isLocal(r.url));
    const osmHits = offsite.filter((r) => r.url.includes("openstreetmap"));

    const lines = [
        `# Gate 3F — opt-in imagery proof`,
        `# captured: ${new Date().toISOString()}`,
        `# pre-set: localStorage.wwv_map_layer = "osm"`,
        `# url:     http://localhost:3010/`,
        `# total requests (second nav onwards): ${all.length}`,
        `# off-site: ${offsite.length}`,
        `# of which OSM tiles: ${osmHits.length}`,
        ``,
    ];
    if (osmHits.length > 0) {
        lines.push("PASS: OSM tiles loading — opt-in seam works.");
        lines.push("Sample OSM hits:");
        for (const r of osmHits.slice(0, 5)) {
            lines.push(`+ ${r.method} ${r.url} (status=${r.status ?? "n/a"})`);
        }
        lines.push("");
        lines.push("Other off-site (informational):");
        for (const r of offsite.filter((r) => !r.url.includes("openstreetmap")).slice(0, 20)) {
            lines.push(`- ${r.method} ${r.url} (status=${r.status ?? "n/a"})`);
        }
    } else {
        lines.push("FAIL: no OSM requests detected. Opt-in seam may not be wired correctly.");
        lines.push("All off-site requests captured:");
        for (const r of offsite) {
            lines.push(`- ${r.method} ${r.url} (status=${r.status ?? "n/a"})`);
        }
    }
    writeFileSync(outArg, lines.join("\n") + "\n");
    console.log(`osm=${osmHits.length} offsite=${offsite.length} total=${all.length}`);
    ws.close();
} catch (e) {
    console.error("gate-3f error:", e.message);
    cleanup(1);
} finally {
    cleanup(0);
}
