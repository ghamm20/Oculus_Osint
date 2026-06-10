import { appendFile, mkdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { NextResponse } from "next/server";

// ───────────────────────────────────────────────────────────────────────────
// ARGOS FUSION (Phase 9, 2026-06-10) — Oculus is ARGOS's map pane, not a sixth
// interface. This route NO LONGER talks to Ollama directly. It is now a THIN
// PROXY to the ARGOS chat endpoint, which owns the single Ollama/model
// lifecycle AND the single hash-chained audit chain. Oculus reasoning events
// flow into ARGOS's audit via the x-oculus-origin marker on the proxied call.
//
// Gate compliance:
//   - ZERO direct Oculus→Ollama: there is no fetch to 11434 / Ollama anywhere
//     in this file (grep-provable). The only upstream is ARGOS.
//   - Single audit chain: ARGOS records chat.inference for every proxied turn;
//     the local breadcrumb below is a NON-authoritative request log only.
//   - Oculus geospatial routes (3010/3011) are untouched — standalone intact.
// ───────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";

const DEFAULT_ARGOS_CHAT_URL = "http://127.0.0.1:7799/api/chat";
// The persona/voice + model are owned by ARGOS; Oculus just names which.
const DEFAULT_PERSONA = "sage"; // research/synthesis — the analyst voice
const DEFAULT_MODEL = "aratan/gemma-4-E4B-q8-it-heretic:latest";
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_HISTORY_MESSAGES = 10;

type ChatRole = "user" | "assistant";

interface ChatMessage {
    role: ChatRole;
    content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function normalizeMessage(value: unknown): ChatMessage | null {
    if (!isRecord(value)) return null;
    const role = value.role;
    const content = value.content;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return null;
    }
    const trimmed = content.trim();
    if (!trimmed) return null;
    return { role, content: trimmed.slice(0, MAX_MESSAGE_CHARS) };
}

function normalizeMessages(payload: unknown): ChatMessage[] {
    if (!isRecord(payload)) return [];
    if (Array.isArray(payload.messages)) {
        return payload.messages
            .map(normalizeMessage)
            .filter((message): message is ChatMessage => message !== null)
            .slice(-MAX_HISTORY_MESSAGES);
    }
    if (typeof payload.message === "string") {
        const content = payload.message.trim();
        return content ? [{ role: "user", content: content.slice(0, MAX_MESSAGE_CHARS) }] : [];
    }
    return [];
}

function getArgosConfig() {
    return {
        chatUrl: (process.env.ARGOS_CHAT_URL || DEFAULT_ARGOS_CHAT_URL).trim().replace(/\/+$/, ""),
        persona: (process.env.ARGOS_PERSONA || DEFAULT_PERSONA).trim(),
        model: (process.env.ARGOS_MODEL || DEFAULT_MODEL).trim(),
    };
}

async function appendProxyBreadcrumb(entry: Record<string, unknown>) {
    // NON-authoritative local request log. The AUTHORITATIVE audit is ARGOS's
    // hash-chained chat.inference entry (single audit chain, ARGOS-owned).
    try {
        const cwd = process.cwd();
        const projectRoot = cwd.endsWith(`${sep}.next${sep}standalone`)
            ? join(cwd, "..", "..")
            : cwd;
        const logsDir = join(projectRoot, "logs");
        await mkdir(logsDir, { recursive: true });
        await appendFile(join(logsDir, "assistant-proxy.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
    } catch (error) {
        console.warn("[assistant/chat] proxy breadcrumb write failed:", error);
    }
}

/** Accumulate the assistant message from ARGOS's NDJSON chat stream. */
function extractFromArgosStream(raw: string): string {
    let out = "";
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
            const j = JSON.parse(t) as { message?: { content?: string } };
            if (j.message?.content) out += j.message.content;
        } catch {
            /* skip non-JSON / partial frame */
        }
    }
    return out.trim();
}

export async function GET() {
    const { chatUrl, persona, model } = getArgosConfig();
    return NextResponse.json({
        status: "configured",
        upstream: "argos",
        argosChatUrl: chatUrl,
        persona,
        model,
        note: "Oculus assistant is a thin proxy to ARGOS; ARGOS owns the model + audit chain.",
    });
}

export async function POST(request: Request) {
    const startedAt = Date.now();
    const { chatUrl, persona, model } = getArgosConfig();
    let messages: ChatMessage[] = [];

    try {
        messages = normalizeMessages(await request.json());
    } catch {
        return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    if (messages.length === 0) {
        return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const breadcrumb = {
        timestamp: new Date().toISOString(),
        route: "/api/assistant/chat",
        upstream: chatUrl,
        persona,
        model,
        messages,
    };

    try {
        // PROXY → ARGOS. The x-oculus-origin header lets ARGOS attribute this
        // turn in its audit chain. No bearer → ARGOS guest mode (Oculus holds
        // no operator session; deliberate isolation).
        const response = await fetch(chatUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-oculus-origin": "assistant-chat" },
            signal: controller.signal,
            body: JSON.stringify({ messages, personaId: persona, model, useRetrieval: false }),
        });

        if (!response.ok) {
            const detail = await response.text();
            await appendProxyBreadcrumb({ ...breadcrumb, status: "argos_error", statusCode: response.status, detail: detail.slice(0, 1_000), durationMs: Date.now() - startedAt });
            return NextResponse.json(
                { error: "ARGOS returned an error.", detail: detail.slice(0, 1_000), offline: false, model },
                { status: 502 },
            );
        }

        const raw = await response.text();
        const assistantMessage = extractFromArgosStream(raw);
        if (!assistantMessage) {
            await appendProxyBreadcrumb({ ...breadcrumb, status: "empty_response", durationMs: Date.now() - startedAt });
            return NextResponse.json({ error: "ARGOS returned an empty response.", offline: false, model }, { status: 502 });
        }

        await appendProxyBreadcrumb({ ...breadcrumb, status: "ok", response: assistantMessage, durationMs: Date.now() - startedAt });
        return NextResponse.json({ message: assistantMessage, model, offline: false });
    } catch (error) {
        const offline = error instanceof Error && (error.name === "AbortError" || error.message.includes("fetch failed"));
        await appendProxyBreadcrumb({ ...breadcrumb, status: offline ? "offline" : "request_error", error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - startedAt });
        return NextResponse.json(
            {
                error: offline ? "ARGOS is offline or unreachable." : "Assistant proxy request failed.",
                offline,
                model,
                argosChatUrl: chatUrl,
            },
            { status: offline ? 503 : 500 },
        );
    } finally {
        clearTimeout(timeout);
    }
}
