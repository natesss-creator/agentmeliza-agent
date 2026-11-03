"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeftIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = { id: string; label: string };
type SocialAccount = { id: string; toolkit: string; status: string };
type ConnectionData = { platforms: Platform[]; accounts: SocialAccount[] };

export function SocialConnections() {
  const [data, setData] = useState<ConnectionData>({ platforms: [], accounts: [] });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string>();
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connect(platform: Platform) {
    setPending(platform.id);
    setError(undefined);
    try {
      const response = await fetch("/api/meliza/social/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: platform.id }),
      });
      const body = (await response.json()) as { redirectUrl?: string; error?: string };
      if (!response.ok || !body.redirectUrl) {
        throw new Error(body.error || `Could not connect ${platform.label}.`);
      }
      window.location.assign(body.redirectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Could not connect ${platform.label}.`);
      setPending(undefined);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        <Button asChild className="mb-8" variant="ghost">
          <Link href="/">
            <ArrowLeftIcon aria-hidden="true" />
            Back to Meliza
          </Link>
        </Button>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Social accounts</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your own accounts securely. Authorization is handled by Composio; Meliza does not ask you for your social passwords.
          </p>
        </header>

        {error ? (
          <p className="mb-5 rounded-lg border border-destructive/30 px-3 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <section aria-label="Your connected accounts" className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium text-sm">Your accounts</h2>
            <Button aria-label="Refresh connected accounts" disabled={loading} onClick={() => void refresh()} size="icon" variant="ghost">
              <RefreshCwIcon aria-hidden="true" className={loading ? "size-4 animate-spin" : "size-4"} />
            </Button>
          </div>

          {loading ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">Loading connections…</p>
          ) : data.accounts.length ? (
            <ul className="divide-y">
              {data.accounts.map((account) => (
                <li className="flex items-center justify-between gap-4 px-4 py-3" key={account.id}>
                  <span className="truncate text-sm">{account.toolkit}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{account.status.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">No social accounts are connected yet.</p>
          )}
        </section>

        <section aria-label="Connect a social account" className="mt-8">
          <h2 className="mb-3 font-medium text-sm">Connect an account</h2>
          {data.platforms.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.platforms.map((platform) => (
                <Button className="h-auto justify-between px-4 py-3" disabled={Boolean(pending) || loading} key={platform.id} onClick={() => void connect(platform)} variant="outline">
                  <span>{pending === platform.id ? `Connecting to ${platform.label}…` : platform.label}</span>
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                </Button>
              ))}
            </div>
          ) : !loading && !error ? (
            <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
              Social connections are not enabled yet. The deployment owner needs to configure Composio and the platform authorization settings.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
