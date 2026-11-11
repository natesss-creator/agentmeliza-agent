"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  FilePlus2Icon,
  LockKeyholeIcon,
  PlusIcon,
  SendIcon,
  Settings2Icon,
  SparklesIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccessGuide, FeatureCards } from "./feature-guide";
import { MAX_USER_MEDIA_BYTES, USER_MEDIA_TYPES } from "@/lib/user-media";

type ChatMedia = {
  url: string;
  contentType: (typeof USER_MEDIA_TYPES)[number];
  name: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  media?: ChatMedia[];
};

export function AgentChat({
  sessionId,
  sessionless = false,
  userId,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
  readonly userId?: string;
}) {
  const storageKey = useMemo(
    () => `meliza-chat:${userId ? `${userId}:` : ""}${sessionId ?? "new"}`,
    [userId, sessionId],
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [error, setError] = useState<string>();
  const [showGuide, setShowGuide] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

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
    if ((!text && attachments.length === 0) || busy) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      ...(attachments.length ? { media: attachments } : {}),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    setUploadError(undefined);
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
        body: JSON.stringify({
          messages: nextMessages,
        }),
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

  const selectFeaturePrompt = (prompt: string) => {
    setInput((current) =>
      current.trim() ? `${current.trimEnd()}\n\n${prompt}` : prompt,
    );
    setShowGuide(false);
    window.requestAnimationFrame(() => composerRef.current?.focus());
  };

  async function uploadMedia(file: File) {
    if (file.size === 0 || file.size > MAX_USER_MEDIA_BYTES) {
      setUploadError("Choose a media file no larger than 4 MB.");
      return;
    }
    if (!USER_MEDIA_TYPES.includes(file.type as ChatMedia["contentType"])) {
      setUploadError("Choose a JPEG, PNG, WebP, or MP4 file.");
      return;
    }
    if (attachments.length >= 4) {
      setUploadError("Attach up to four media files per message.");
      return;
    }

    setUploading(true);
    setUploadError(undefined);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/meliza/media", { method: "POST", body: form });
      const body = (await response.json()) as { media?: ChatMedia; error?: string };
      if (!response.ok || !body.media) {
        throw new Error(body.error || "Could not upload this media.");
      }
      setAttachments((current) => [...current, body.media!]);
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : "Could not upload this media.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b bg-background/90 pl-14 pr-4 backdrop-blur-xl sm:pl-16 sm:pr-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
            <SparklesIcon aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight">Meliza</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                Ready
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Your AI marketing workspace
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors hover:bg-accent sm:text-sm"
            href="/settings/connections"
          >
            <Settings2Icon aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Connect accounts</span>
            <span className="sm:hidden">Connect</span>
          </Link>
          <Button
            aria-label="Guide and features"
            aria-haspopup="dialog"
            onClick={() => setShowGuide(true)}
            size="icon"
            variant="ghost"
          >
            <BookOpenIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            aria-label="Start a new chat"
            className="gap-1.5"
            onClick={clearChat}
            size="sm"
            variant="outline"
          >
            <PlusIcon aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">New chat</span>
          </Button>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          {messages.length === 0 ? (
            <div className="space-y-7">
              <section className="relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br from-card via-card to-emerald-500/10 px-5 py-7 shadow-sm sm:px-9 sm:py-10">
                <div aria-hidden="true" className="absolute -right-14 -top-20 -z-10 size-64 rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="max-w-2xl">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <LockKeyholeIcon aria-hidden="true" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    Your work, thoughtfully handled
                  </div>
                  <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">
                    Let’s make your next move count.
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                    Bring a marketing question, a product or service to promote, or a draft to improve. Meliza helps you research, plan, and prepare—with you in control of every action.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2Icon aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Review before action
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CheckCircle2Icon aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" />
                      Only your connected accounts
                    </span>
                  </div>
                </div>
              </section>
              <AccessGuide />
              <section aria-labelledby="feature-list-title">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h2 className="font-semibold tracking-tight" id="feature-list-title">Choose a place to start</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Examples add a prompt to your composer—you can edit it before sending.</p>
                  </div>
                  <SparklesIcon aria-hidden="true" className="mb-1 hidden size-5 text-emerald-600 sm:block dark:text-emerald-400" />
                </div>
                <FeatureCards disabled={busy} onSelectPrompt={selectFeaturePrompt} />
              </section>
            </div>
          ) : (
            <div aria-live="polite" className="space-y-6 py-2">
              {messages.map((message) => (
                <article
                  className={message.role === "user" ? "ml-auto max-w-[88%]" : "mr-auto max-w-[94%]"}
                  key={message.id}
                >
                  {message.role === "assistant" ? (
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span className="flex size-6 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
                        <SparklesIcon aria-hidden="true" className="size-3.5" />
                      </span>
                      Meliza
                    </div>
                  ) : null}
                  <div className={message.role === "user"
                    ? "whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm"
                    : "whitespace-pre-wrap rounded-2xl rounded-tl-md border bg-card px-4 py-3 text-sm leading-6 shadow-sm"}>
                    {message.content || (busy && message.role === "assistant" ? "Thinking…" : "")}
                    {message.media?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.media.map((media) => media.contentType.startsWith("image/") ? (
                          <img
                            alt={media.name || "User-provided campaign media"}
                            className="max-h-48 max-w-48 rounded-lg object-cover"
                            key={media.url}
                            src={media.url}
                          />
                        ) : (
                          <a
                            className="underline underline-offset-4"
                            href={media.url}
                            key={media.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View attached video: {media.name}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
          {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}
        </div>
      </section>

      <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
        {attachments.length ? (
          <div className="mx-auto mb-3 flex max-w-4xl flex-wrap gap-2">
            {attachments.map((media) => (
              <div className="flex items-center gap-2 rounded-lg border bg-card px-2 py-1 text-xs" key={media.url}>
                <span className="max-w-48 truncate">{media.name}</span>
                <Button
                  aria-label={`Remove ${media.name}`}
                  onClick={() => setAttachments((current) => current.filter((item) => item.url !== media.url))}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {uploadError ? <p className="mx-auto mb-2 max-w-3xl text-sm text-destructive" role="alert">{uploadError}</p> : null}
        <form className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/40" onSubmit={handleSubmit}>
          <input
            accept={USER_MEDIA_TYPES.join(",")}
            className="sr-only"
            disabled={busy || uploading}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void uploadMedia(file);
              event.currentTarget.value = "";
            }}
            ref={mediaInputRef}
            type="file"
          />
          <Button
            aria-label="Attach media"
            className="shrink-0 rounded-xl"
            disabled={busy || uploading || attachments.length >= 4}
            onClick={() => mediaInputRef.current?.click()}
            size="icon"
            type="button"
            variant="outline"
          >
            <FilePlus2Icon aria-hidden="true" className={uploading ? "size-4 animate-pulse" : "size-4"} />
          </Button>
          <textarea
            aria-label="Message Meliza"
            className="max-h-40 min-h-11 flex-1 resize-y rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
            disabled={busy}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Message Meliza about your next campaign…"
            ref={composerRef}
            value={input}
          />
          <Button
            aria-label={busy ? "Meliza is responding" : "Send message"}
            className="size-10 shrink-0 rounded-xl"
            disabled={busy || uploading || (input.trim().length === 0 && attachments.length === 0)}
            size="icon"
            type="submit"
          >
            {busy ? <SquareIcon aria-hidden="true" className="size-4" /> : <SendIcon aria-hidden="true" className="size-4" />}
          </Button>
        </form>
        <p className="mx-auto mt-2 max-w-4xl px-1 text-[11px] leading-5 text-muted-foreground">
          Uploaded media is stored at a public URL for social platforms. Only upload content you’re authorized to share. Images are sent to Meliza for review; videos are attached as publishable links.
        </p>
      </div>
      <Dialog onOpenChange={setShowGuide} open={showGuide}>
        <DialogContent className="max-h-[90dvh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Meliza guide & features</DialogTitle>
            <DialogDescription>
              Pick an example to put it in your message box. Review it and send it when you’re ready.
            </DialogDescription>
          </DialogHeader>
          <AccessGuide />
          <FeatureCards disabled={busy} onSelectPrompt={selectFeaturePrompt} />
        </DialogContent>
      </Dialog>
    </main>
  );
}
