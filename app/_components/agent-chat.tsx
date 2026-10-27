"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { PlusIcon, SendIcon, SquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const AGENT_NAME = "agentmeliza";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const storageKey = useMemo(
    () => `meliza-chat:${sessionId ?? "new"}`,
    [sessionId],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (sessionless) {
      setMessages([]);
      return;
    }
    try {
      const saved = window.localStorage.getItem(storageKey);
      setMessages(saved ? (JSON.parse(saved) as ChatMessage[]) : []);
    } catch {
      setMessages([]);
    }
  }, [sessionless, storageKey]);

  useEffect(() => {
    if (!sessionless) {
      window.localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, sessionless, storageKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError(undefined);
    setBusy(true);

    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text() || "The agent request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content } : message,
          ),
        );
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The agent request failed.";
      setError(message);
      setMessages((current) => current.filter((item) => item.id !== assistantId));
    } finally {
      setBusy(false);
    }
  }

  const clearChat = () => {
    setMessages([]);
    setError(undefined);
    if (!sessionless) window.localStorage.removeItem(storageKey);
  };

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <span className="text-sm font-medium">{AGENT_NAME}</span>
        <div className="flex items-center gap-1">
          <Button aria-label="Start a new chat" onClick={clearChat} size="sm" variant="ghost">
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[50vh] items-center justify-center text-center">
              <div>
                <h1 className="font-medium text-5xl tracking-tighter">{AGENT_NAME}</h1>
                <p className="mt-3 text-muted-foreground">Ask Meliza to plan, research, analyze, or execute an authorized task.</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-primary-foreground" : "max-w-[90%] whitespace-pre-wrap rounded-2xl border px-4 py-3"}>
                {message.content || (busy && message.role === "assistant" ? "Thinking…" : "")}
              </div>
            ))
          )}
          {error ? <p className="rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </section>

      <div className="border-t bg-background px-4 py-4 sm:px-6">
        <form className="mx-auto flex max-w-3xl items-end gap-2" onSubmit={handleSubmit}>
          <textarea
            className="min-h-12 flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            disabled={busy}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Send a message…"
            value={input}
          />
          <Button disabled={busy || input.trim().length === 0} size="icon" type="submit">
            {busy ? <SquareIcon className="size-4" /> : <SendIcon className="size-4" />}
          </Button>
        </form>
      </div>
    </main>
  );
}
