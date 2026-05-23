"use client";

import { FormEvent, useMemo, useState } from "react";
import { BrainCircuit, LoaderCircle, Send, ShieldCheck, WifiOff } from "lucide-react";

type AnalystRole = "user" | "assistant";

interface AnalystMessage {
    role: AnalystRole;
    content: string;
}

type AssistantStatus = "idle" | "thinking" | "online" | "offline" | "error";

export function OculusAnalystPanel() {
    const [messages, setMessages] = useState<AnalystMessage[]>([
        {
            role: "assistant",
            content: "Oculus Analyst standing by.",
        },
    ]);
    const [prompt, setPrompt] = useState("");
    const [status, setStatus] = useState<AssistantStatus>("idle");
    const [model, setModel] = useState<string | null>(null);

    const statusLabel = useMemo(() => {
        if (status === "thinking") return "Thinking";
        if (status === "offline") return "Ollama offline";
        if (status === "error") return "Check failed";
        if (status === "online") return model ?? "Local LLM";
        return "Local LLM";
    }, [model, status]);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const content = prompt.trim();
        if (!content || status === "thinking") return;

        const nextMessages = [...messages, { role: "user" as const, content }];
        setMessages(nextMessages);
        setPrompt("");
        setStatus("thinking");

        try {
            const response = await fetch("/api/assistant/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: nextMessages
                        .filter((message) => message.role === "user" || message.role === "assistant")
                        .slice(-8),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                const fallback = data?.offline
                    ? "Ollama is offline. Start Ollama or update LOCAL_LLM_BASE_URL."
                    : data?.error ?? "The local assistant could not answer.";
                setStatus(data?.offline ? "offline" : "error");
                setMessages((current) => [...current, { role: "assistant", content: fallback }]);
                return;
            }

            setModel(typeof data.model === "string" ? data.model : null);
            setStatus("online");
            setMessages((current) => [
                ...current,
                { role: "assistant", content: data.message ?? "No response returned." },
            ]);
        } catch {
            setStatus("offline");
            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: "Ollama is offline. Start Ollama or update LOCAL_LLM_BASE_URL.",
                },
            ]);
        }
    }

    return (
        <div className="assistant-panel">
            <div className="assistant-panel__header">
                <div className="assistant-panel__title">
                    <BrainCircuit size={16} />
                    <span>Oculus Analyst</span>
                </div>
                <div className="assistant-panel__badge">
                    <ShieldCheck size={12} />
                    <span>Read-only</span>
                </div>
            </div>

            <div className={`assistant-panel__status assistant-panel__status--${status}`}>
                {status === "thinking" ? <LoaderCircle size={13} className="assistant-panel__spin" /> : null}
                {status === "offline" ? <WifiOff size={13} /> : null}
                <span>{statusLabel}</span>
            </div>

            <div className="assistant-panel__transcript" aria-live="polite">
                {messages.map((message, index) => (
                    <div
                        key={`${message.role}-${index}`}
                        className={`assistant-panel__message assistant-panel__message--${message.role}`}
                    >
                        {message.content}
                    </div>
                ))}
            </div>

            <form className="assistant-panel__composer" onSubmit={handleSubmit}>
                <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ask Oculus Analyst..."
                    rows={3}
                    disabled={status === "thinking"}
                />
                <button
                    className="btn btn--glow assistant-panel__send"
                    type="submit"
                    disabled={!prompt.trim() || status === "thinking"}
                    title="Send"
                >
                    <Send size={15} />
                </button>
            </form>
        </div>
    );
}
