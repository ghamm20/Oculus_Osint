import { appendFile, mkdir } from "node:fs/promises";
import { join, sep } from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "llama3.2";
const REQUEST_TIMEOUT_MS = 45_000;
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
    return {
        role,
        content: trimmed.slice(0, MAX_MESSAGE_CHARS),
    };
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

function getOllamaConfig() {
    return {
        baseUrl: (process.env.LOCAL_LLM_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, ""),
        model: (process.env.LOCAL_LLM_MODEL || DEFAULT_MODEL).trim(),
    };
}

async function appendAssistantAudit(entry: Record<string, unknown>) {
    try {
        const cwd = process.cwd();
        const projectRoot = cwd.endsWith(`${sep}.next${sep}standalone`)
            ? join(cwd, "..", "..")
            : cwd;
        const logsDir = join(projectRoot, "logs");
        await mkdir(logsDir, { recursive: true });
        await appendFile(
            join(logsDir, "assistant-audit.jsonl"),
            `${JSON.stringify(entry)}\n`,
            "utf8",
        );
    } catch (error) {
        console.warn("[assistant/chat] Audit write failed:", error);
    }
}

function extractOllamaMessage(payload: unknown): string | null {
    if (!isRecord(payload)) return null;
    const message = payload.message;
    if (isRecord(message) && typeof message.content === "string") {
        return message.content.trim();
    }
    if (typeof payload.response === "string") {
        return payload.response.trim();
    }
    return null;
}

export async function GET() {
    const { baseUrl, model } = getOllamaConfig();
    return NextResponse.json({
        status: "configured",
        baseUrl,
        model,
        auditLog: "logs/assistant-audit.jsonl",
    });
}

export async function POST(request: Request) {
    const startedAt = Date.now();
    const { baseUrl, model } = getOllamaConfig();
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
    const auditBase = {
        timestamp: new Date().toISOString(),
        route: "/api/assistant/chat",
        baseUrl,
        model,
        messages,
    };

    try {
        const response = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                model,
                stream: false,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are Oculus Analyst, a local read-only OSINT assistant inside Oculus0Osint. Analyze only the user-provided text and general context. Do not claim to control the app, change settings, browse private data, or perform actions. Be concise, careful with uncertainty, and avoid operational instructions that would enable harm.",
                    },
                    ...messages,
                ],
            }),
        });

        if (!response.ok) {
            const detail = await response.text();
            await appendAssistantAudit({
                ...auditBase,
                status: "ollama_error",
                statusCode: response.status,
                detail: detail.slice(0, 1_000),
                durationMs: Date.now() - startedAt,
            });
            return NextResponse.json(
                {
                    error: "Ollama returned an error.",
                    detail: detail.slice(0, 1_000),
                    offline: false,
                    model,
                },
                { status: 502 },
            );
        }

        const payload = await response.json();
        const assistantMessage = extractOllamaMessage(payload);
        if (!assistantMessage) {
            await appendAssistantAudit({
                ...auditBase,
                status: "empty_response",
                durationMs: Date.now() - startedAt,
            });
            return NextResponse.json(
                { error: "Ollama returned an empty response.", offline: false, model },
                { status: 502 },
            );
        }

        await appendAssistantAudit({
            ...auditBase,
            status: "ok",
            response: assistantMessage,
            durationMs: Date.now() - startedAt,
        });

        return NextResponse.json({
            message: assistantMessage,
            model,
            offline: false,
        });
    } catch (error) {
        const offline = error instanceof Error && (error.name === "AbortError" || error.message.includes("fetch failed"));
        await appendAssistantAudit({
            ...auditBase,
            status: offline ? "offline" : "request_error",
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - startedAt,
        });
        return NextResponse.json(
            {
                error: offline
                    ? "Ollama is offline or unreachable."
                    : "Local assistant request failed.",
                offline,
                model,
                baseUrl,
            },
            { status: offline ? 503 : 500 },
        );
    } finally {
        clearTimeout(timeout);
    }
}
