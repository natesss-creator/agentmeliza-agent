"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type KeyState = { configured: boolean; preview: string | null };

export function ApiKeySettings() {
  const [state, setState] = useState<KeyState>();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/meliza/api-keys", { cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json()) as KeyState & { error?: string };
        if (!r.ok) throw new Error(body.error || "Could not load API key settings.");
        setState(body);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load API key settings."));
  }, []);

  async function call(method: "PUT" | "DELETE") {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/meliza/api-keys", {
        method,
        headers: { "content-type": "application/json" },
        body: method === "PUT" ? JSON.stringify({ key }) : undefined,
      });
      const body = (await response.json()) as KeyState & { error?: string };
      if (!response.ok) throw new Error(body.error || "Request failed.");
      setState(body);
      setKey("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="gemini-key-title" className="mx-auto max-w-2xl px-5 py-7 sm:px-7">
      <h1 className="text-lg font-semibold tracking-tight" id="gemini-key-title">Gemini API key</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Optional. When set, your chats use your own Google Gemini key instead of the shared one. It is encrypted at rest and never shown again after saving.
      </p>
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
      {state?.configured ? (
        <div className="mt-5 flex items-center justify-between rounded-xl border bg-card p-4">
          <p className="text-sm">Key saved: <code>{state.preview}</code></p>
          <Button disabled={busy} onClick={() => void call("DELETE")} size="sm" variant="outline">Remove</Button>
        </div>
      ) : null}
      <form
        className="mt-5 rounded-xl border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void call("PUT");
        }}
      >
        <label className="block text-sm font-medium" htmlFor="gemini-key">{state?.configured ? "Replace key" : "Add key"}</label>
        <input
          autoComplete="off"
          className="mt-2 w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
          id="gemini-key"
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza…"
          spellCheck={false}
          type="password"
          value={key}
        />
        <Button className="mt-3" disabled={busy || key.trim().length < 20} type="submit">Save key</Button>
      </form>
    </section>
  );
}
