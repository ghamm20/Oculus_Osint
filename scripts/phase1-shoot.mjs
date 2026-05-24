// Tiny Chrome DevTools Protocol screenshotter for Phase 1 gates.
// Usage: node scripts/phase1-shoot.mjs <url> <out.png> [cookieFile]
// cookieFile is the Netscape-format file produced by curl -c.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import WebSocket from "ws";

const [, , urlArg, outArg, cookieFileArg] = process.argv;
if (!urlArg || !outArg) {
    console.error("Usage: node scripts/phase1-shoot.mjs <url> <out.png> [cookieFile]");
    process.exit(2);
}

function findEdge() {
    const candidates = [
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ];
    return candidates.find((p) => existsSync(p));
}

function parseCookies(path) {
    if (!path || !existsSync(path)) return [];
    const cookies = [];
    for (const rawLine of readFileSync(path, "utf8").split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line || line.startsWith("# ")) continue;
        let cleaned = line.startsWith("#HttpOnly_") ? line.replace("#HttpOnly_", "") : line;
        const parts = cleaned.split("\t").map((p) => p.replace(/\r$/, "").trim());
        if (parts.length < 7) continue;
        const [domain, , path2, secureStr, expires, name, value] = parts;
        cookies.push({
            name,
            value,
            domain,
            path: path2,
            secure: secureStr === "TRUE",
            httpOnly: line.startsWith("#HttpOnly_"),
            expires: Number(expires) || -1,
        });
    }
    return cookies;
}

const edge = findEdge();
if (!edge) {
    console.error("No Edge/Chrome binary found.");
    process.exit(2);
}

const profileDir = join(tmpdir(), `phase1-edge-${process.pid}`);
mkdirSync(profileDir, { recursive: true });
const debugPort = 9222 + Math.floor(Math.random() * 1000);

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
    { stdio: ["ignore", "pipe", "pipe"], detached: false },
);

function killEdgeAndExit(code) {
    try { child.kill("SIGKILL"); } catch {}
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
    process.exit(code);
}
process.on("SIGINT", () => killEdgeAndExit(130));
process.on("SIGTERM", () => killEdgeAndExit(143));
process.on("uncaughtException", (e) => {
    console.error("shoot uncaughtException:", e.message);
    killEdgeAndExit(1);
});

let nextId = 1;
function cdpCall(ws, method, params = {}, sessionId) {
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
    for (let attempt = 0; attempt < 30; attempt++) {
        try {
            const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
            if (res.ok) return await res.json();
        } catch {}
        await wait(200);
    }
    throw new Error("CDP did not respond");
}

async function listTargets() {
    const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
    return await res.json();
}

try {
    const version = await discover();
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.once("open", res);
        ws.once("error", rej);
    });

    const targets = await listTargets();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");

    const attached = await cdpCall(ws, "Target.attachToTarget", {
        targetId: page.id,
        flatten: true,
    });
    const sessionId = attached.sessionId;

    await cdpCall(ws, "Page.enable", {}, sessionId);
    await cdpCall(ws, "Network.enable", {}, sessionId);

    const cookies = parseCookies(cookieFileArg);
    if (cookies.length) {
        // Only send the auth session cookie; CSRF/callback cookies aren't needed
        // for an authenticated GET and may contain encoded chars CDP rejects.
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
            await cdpCall(
                ws,
                "Network.setExtraHTTPHeaders",
                { headers: { Cookie: header } },
                sessionId,
            );
        }
    }

    const navResultP = new Promise((resolve) => {
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
                ws.off("message", handler);
                resolve();
            }
        };
        ws.on("message", handler);
        // Hard fallback so a long-loading SPA doesn't hang the screenshot.
        setTimeout(resolve, Number(process.env.SHOOT_NAV_TIMEOUT_MS) || 20000);
    });
    await cdpCall(ws, "Page.navigate", { url: urlArg }, sessionId);
    await navResultP;

    // Brief settle for client-rendered content (Cesium etc.)
    const settleMs = Number(process.env.SHOOT_SETTLE_MS) || 4000;
    await wait(settleMs);

    if (process.env.SHOOT_EVAL) {
        await cdpCall(
            ws,
            "Runtime.evaluate",
            { expression: process.env.SHOOT_EVAL, awaitPromise: true },
            sessionId,
        );
        const postEvalMs = Number(process.env.SHOOT_POST_EVAL_MS) || 4000;
        await wait(postEvalMs);
    }

    const shot = await cdpCall(
        ws,
        "Page.captureScreenshot",
        { format: "png" },
        sessionId,
    );
    writeFileSync(outArg, Buffer.from(shot.data, "base64"));
    console.log(`saved ${outArg} (${Buffer.from(shot.data, "base64").length} bytes)`);
    ws.close();
} catch (e) {
    console.error("shoot error:", e.message);
    killEdgeAndExit(1);
} finally {
    try { child.kill("SIGKILL"); } catch {}
    try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
