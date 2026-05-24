// Gate F: open the app via headless CDP, observe every network request,
// filter localhost/127.0.0.1, write the rest to disk.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import WebSocket from "ws";

const [, , urlArg, outArg, cookieFileArg] = process.argv;
if (!urlArg || !outArg) {
    console.error("Usage: node scripts/phase1-gate-f.mjs <url> <out.txt> [cookieFile]");
    process.exit(2);
}

function findEdge() {
    const candidates = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ];
    return candidates.find((p) => existsSync(p));
}

function parseCookies(path) {
    if (!path || !existsSync(path)) return [];
    const cookies = [];
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line || line.startsWith("# ")) continue;
        const cleaned = line.startsWith("#HttpOnly_") ? line.replace("#HttpOnly_", "") : line;
        const parts = cleaned.split("\t").map((p) => p.replace(/\r$/, "").trim());
        if (parts.length < 7) continue;
        const [, , , , , name, value] = parts;
        cookies.push({ name, value });
    }
    return cookies;
}

const edge = findEdge();
if (!edge) {
    console.error("No Edge/Chrome binary found.");
    process.exit(2);
}

const profileDir = join(tmpdir(), `phase1-gateF-${process.pid}`);
mkdirSync(profileDir, { recursive: true });
const debugPort = 9300 + Math.floor(Math.random() * 500);

const child = spawn(
    edge,
    [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-component-extensions-with-background-pages",
        "--no-default-browser-check",
        "--no-first-run",
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        "--window-size=1280,800",
        "about:blank",
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
);

function cleanup(code) {
    try { child.kill("SIGKILL"); } catch {}
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
    process.exit(code);
}
process.on("SIGINT", () => cleanup(130));
process.on("uncaughtException", (e) => { console.error("uncaught:", e.message); cleanup(1); });

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
        try {
            const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
            if (r.ok) return await r.json();
        } catch {}
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

    const cookies = parseCookies(cookieFileArg);
    if (cookies.length) {
        const wanted = new Set([
            "authjs.session-token",
            "next-auth.session-token",
            "__Secure-authjs.session-token",
            "__Secure-next-auth.session-token",
        ]);
        const header = cookies
            .filter((c) => c.value && wanted.has(c.name))
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");
        if (header) {
            await cdp(ws, "Network.setExtraHTTPHeaders", { headers: { Cookie: header } }, sessionId);
        }
    }

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
            responses.set(requestId, { status: response.status, fromCache: response.fromDiskCache });
        }
    });

    const loaded = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
                ws.off("message", handler);
                resolve();
            }
        };
        ws.on("message", handler);
        setTimeout(resolve, 20000);
    });
    await cdp(ws, "Page.navigate", { url: urlArg }, sessionId);
    await loaded;

    // Watch for an extra 8s to catch any deferred outbound calls
    await wait(8000);

    const all = [];
    for (const [id, req] of requests.entries()) {
        const resp = responses.get(id) || {};
        all.push({ ...req, status: resp.status, fromCache: resp.fromCache });
    }

    function isLocal(url) {
        try {
            const u = new URL(url);
            return (
                u.hostname === "localhost" ||
                u.hostname === "127.0.0.1" ||
                u.hostname === "0.0.0.0" ||
                u.hostname === "::1" ||
                u.protocol === "data:" ||
                u.protocol === "blob:"
            );
        } catch {
            return false;
        }
    }

    const offsite = all.filter((r) => !isLocal(r.url));
    const lines = [
        `# Gate F — outbound network audit`,
        `# captured: ${new Date().toISOString()}`,
        `# url: ${urlArg}`,
        `# total requests observed: ${all.length}`,
        `# requests to localhost / 127.0.0.1 / data: / blob: : ${all.length - offsite.length}`,
        `# off-site requests: ${offsite.length}`,
        ``,
    ];
    if (offsite.length === 0) {
        lines.push("PASS: no requests to non-localhost origins.");
    } else {
        lines.push("FAIL: off-site requests detected.");
        for (const r of offsite) {
            lines.push(`- ${r.method} ${r.url}  (status=${r.status ?? "n/a"} type=${r.type ?? "n/a"} initiator=${r.initiator ?? "n/a"})`);
        }
    }
    writeFileSync(outArg, lines.join("\n") + "\n");
    console.log(`offsite=${offsite.length} / total=${all.length}`);
    ws.close();
} catch (e) {
    console.error("gate-f error:", e.message);
    cleanup(1);
} finally {
    cleanup(0);
}
