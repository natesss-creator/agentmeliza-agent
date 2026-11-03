"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLinkIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = { id: string; label: string };
type SocialAccount = { id: string; toolkit: string; status: string };
type ConnectionData = { platforms: Platform[]; accounts: SocialAccount[] };

export function SocialConnections() {
  return <SocialConnectionsPanel />;
}

export function SocialConnectionsDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section aria-label="Social account connections" aria-modal="true" className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background p-5 text-foreground shadow-xl sm:p-7" role="dialog">
        <Button aria-label="Close social account settings" className="absolute top-3 right-3" onClick={onClose} size="icon" variant="ghost"><XIcon aria-hidden="true" className="size-4" /></Button>
        <SocialConnectionsPanel />
      </section>
    </div>
  );
}

function SocialConnectionsPanel() {
  const [data, setData] = useState<ConnectionData>({ platforms: [], accounts: [] });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string>();
  const [fallbackLink, setFallbackLink] = useState<{ label: string; url: string }>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch("/api/meliza/social/connections", { cache: "no-store" });
      const body = (await response.json()) as ConnectionData & { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load your connected accounts.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your connected accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function connect(platform: Platform) {
    // Open synchronously from the click to avoid popup blockers; the main Meliza tab stays put.
    const popup = window.open("about:blank", "meliza-social-authorization", "popup,width=600,height=720");
    setPending(platform.id);
    setFallbackLink(undefined);
    setError(undefined);
    try {
      const response = await fetch("/api/meliza/social/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: platform.id }),
      });
      const body = (await response.json()) as { redirectUrl?: string; error?: string };
      if (!response.ok || !body.redirectUrl) throw new Error(body.error || `Could not connect ${platform.label}.`);

      if (!popup) {
        setFallbackLink({ label: platform.label, url: body.redirectUrl });
        setPending(undefined);
        return;
      }
      popup.location.replace(body.redirectUrl);
      const deadline = Date.now() + 5 * 60_000;
      while (!popup.closed && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
      }
      setPending(undefined);
      await refresh();
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : `Could not connect ${platform.label}.`);
      setPending(undefined);
    }
  }

  return (
    <div className="pt-1">
      <header className="mb-6 pr-8">
        <h1 className="text-2xl font-semibold tracking-tight">Social accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Connect an account without leaving Meliza. Authorization opens in a separate secure window, so this conversation stays open.</p>
        <p className="mt-2 text-xs text-muted-foreground">Meliza never asks for or stores your social password or API secret. Sign in directly with the social platform in the authorization window.</p>
      </header>

      {error ? <p className="mb-5 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive" role="alert">{error}</p> : null}

      <section aria-label="Your connected accounts" className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-medium text-sm">Your accounts</h2>
          <Button aria-label="Refresh connected accounts" disabled={loading} onClick={() => void refresh()} size="icon" variant="ghost"><RefreshCwIcon aria-hidden="true" className={loading ? "size-4 animate-spin" : "size-4"} /></Button>
        </div>
        {loading ? <p className="px-4 py-5 text-sm text-muted-foreground">Loading connections…</p> : data.accounts.length ? (
          <ul className="divide-y">
            {data.accounts.map((account) => <li className="flex items-center justify-between gap-4 px-4 py-3" key={account.id}><span className="truncate text-sm">{account.toolkit}</span><span className="shrink-0 text-xs text-muted-foreground">{account.status.toLowerCase()}</span></li>)}
          </ul>
        ) : <p className="px-4 py-5 text-sm text-muted-foreground">No social accounts are connected yet.</p>}
      </section>

      <section aria-label="Connect a social account" className="mt-7">
        <h2 className="mb-3 font-medium text-sm">Connect an account</h2>
        {data.platforms.length ? <div className="grid gap-3 sm:grid-cols-2">
          {data.platforms.map((platform) => <Button className="h-auto justify-between px-4 py-3" disabled={Boolean(pending) || loading} key={platform.id} onClick={() => void connect(platform)} variant="outline"><span>{pending === platform.id ? `Waiting for ${platform.label} authorization…` : platform.label}</span><ExternalLinkIcon aria-hidden="true" className="size-4" /></Button>)}
        </div> : !loading && !error ? <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">Social connections are not enabled yet. The deployment owner needs to configure Composio and the platform authorization settings.</p> : null}
        {fallbackLink ? <p className="mt-4 text-sm text-muted-foreground">Your browser blocked the popup. <a className="font-medium text-foreground underline underline-offset-4" href={fallbackLink.url} rel="noopener noreferrer" target="_blank">Continue {fallbackLink.label} authorization in a new tab</a>, then return here and refresh your accounts.</p> : null}
      </section>

      <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Link className="text-sm text-muted-foreground underline underline-offset-4" href="https://composio.dev/auth" rel="noreferrer" target="_blank">How account authorization works</Link>
        <Button onClick={() => void refresh()} variant="outline">Refresh accounts</Button>
      </footer>
    </div>
  );
}
