"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ExternalLinkIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PackageSettings } from "./package-settings";

type Platform = { id: string; label: string };
type SocialAccount = { id: string; toolkit: string; status: string };
type ConnectionData = { platforms: Platform[]; accounts: SocialAccount[] };
type ReportData = {
  enabled: boolean;
  email: string;
  emailVerified: boolean;
  gmailConfigured: boolean;
  gmailConnected: boolean;
};

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
  const [wizardStep, setWizardStep] = useState<"choose" | "connect">("choose");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [reportData, setReportData] = useState<ReportData>();
  const [reportLoading, setReportLoading] = useState(true);
  const [reportSaving, setReportSaving] = useState(false);
  const [reportError, setReportError] = useState<string>();

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

  const refreshReports = useCallback(async () => {
    setReportLoading(true);
    setReportError(undefined);
    try {
      const response = await fetch("/api/meliza/reports", { cache: "no-store" });
      const body = (await response.json()) as ReportData & { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load report settings.");
      setReportData(body);
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : "Could not load report settings.");
    } finally {
      setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshReports();
  }, [refresh, refreshReports]);

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
      await Promise.all([refresh(), refreshReports()]);
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : `Could not connect ${platform.label}.`);
      setPending(undefined);
    }
  }

  function isConnected(platform: Platform): boolean {
    return data.accounts.some((account) => {
      const status = account.status.toLowerCase();
      return (
        account.toolkit.toLowerCase().includes(platform.id.toLowerCase()) &&
        ["active", "connected", "enabled"].includes(status)
      );
    });
  }

  function togglePlatform(platformId: string) {
    setSelectedPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((id) => id !== platformId)
        : [...current, platformId],
    );
  }

  const selectedConnections = selectedPlatforms
    .map((platformId) => data.platforms.find((platform) => platform.id === platformId))
    .filter((platform): platform is Platform => platform !== undefined);
  const allSelectedConnected =
    selectedConnections.length > 0 && selectedConnections.every(isConnected);

  async function setDailyReports(enabled: boolean) {
    setReportSaving(true);
    setReportError(undefined);
    try {
      const response = await fetch("/api/meliza/reports", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const body = (await response.json()) as { enabled?: boolean; error?: string };
      if (!response.ok || typeof body.enabled !== "boolean") {
        throw new Error(body.error || "Could not update daily report settings.");
      }
      setReportData((current) => current ? { ...current, enabled: body.enabled! } : current);
    } catch (caught) {
      setReportError(caught instanceof Error ? caught.message : "Could not update daily report settings.");
      await refreshReports();
    } finally {
      setReportSaving(false);
    }
  }

  return (
    <div className="pt-1">
      <header className="mb-6 pr-8">
        <h1 className="text-2xl font-semibold tracking-tight">Social accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground">Google sign-in identifies your Meliza account; it does not connect your social accounts. Choose the platforms you want to authorize. Each opens in a separate secure window, so this conversation stays open.</p>
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

      <section aria-label="Connect social accounts" className="mt-7 rounded-xl border p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Account setup · {wizardStep === "choose" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            <h2 className="mt-1 font-medium">Connect your accounts</h2>
          </div>
          {wizardStep === "connect" ? (
            <Button
              disabled={Boolean(pending)}
              onClick={() => setWizardStep("choose")}
              size="sm"
              variant="ghost"
            >
              Change selection
            </Button>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading available accounts…</p>
        ) : data.platforms.length ? wizardStep === "choose" ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Select the services you want to connect. You’ll authorize each one directly with its provider; Meliza never sees your password.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.platforms.map((platform) => {
                const connected = isConnected(platform);
                const selected = selectedPlatforms.includes(platform.id);
                return (
                  <button
                    aria-pressed={selected}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      connected
                        ? "cursor-default bg-muted/50 text-muted-foreground"
                        : selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                    }`}
                    disabled={connected}
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    type="button"
                  >
                    <span>{platform.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {connected ? "Connected" : selected ? "Selected" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {data.platforms.filter(isConnected).length} of {data.platforms.length} connected
              </span>
              <Button
                disabled={!selectedPlatforms.some((id) => data.platforms.some((platform) => platform.id === id))}
                onClick={() => setWizardStep("connect")}
                size="sm"
              >
                Continue
              </Button>
            </div>
          </>
        ) : allSelectedConnected ? (
          <div className="rounded-lg bg-muted/50 px-4 py-5 text-center">
            <p className="font-medium text-sm">Your selected accounts are connected.</p>
            <p className="mt-1 text-sm text-muted-foreground">You can close this setup or connect more accounts.</p>
            <Button
              className="mt-4"
              onClick={() => {
                setSelectedPlatforms([]);
                setWizardStep("choose");
              }}
              size="sm"
              variant="outline"
            >
              Connect more accounts
            </Button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect each selected service. The provider authorization opens separately and returns you here when finished.
            </p>
            <ol className="space-y-2">
              {selectedConnections.map((platform, index) => {
                const connected = isConnected(platform);
                return (
                  <li className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" key={platform.id}>
                    <span className="min-w-0 text-sm">
                      <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                      {platform.label}
                    </span>
                    {connected ? (
                      <span className="shrink-0 text-xs text-muted-foreground">Connected</span>
                    ) : (
                      <Button
                        disabled={Boolean(pending)}
                        onClick={() => void connect(platform)}
                        size="sm"
                        variant="outline"
                      >
                        {pending === platform.id ? "Waiting…" : "Connect"}
                        {pending === platform.id ? null : <ExternalLinkIcon aria-hidden="true" className="ml-2 size-3.5" />}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex justify-end">
              <Button
                disabled={!allSelectedConnected}
                onClick={() => {
                  setSelectedPlatforms([]);
                  setWizardStep("choose");
                }}
                size="sm"
              >
                Finish setup
              </Button>
            </div>
          </>
        ) : !error ? (
          <p className="rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
            Social connections are not enabled yet. The deployment owner needs to configure Composio and the platform authorization settings.
          </p>
        ) : null}
        {fallbackLink ? <p className="mt-4 text-sm text-muted-foreground">Your browser blocked the popup. <a className="font-medium text-foreground underline underline-offset-4" href={fallbackLink.url} rel="noopener noreferrer" target="_blank">Continue {fallbackLink.label} authorization in a new tab</a>, then return here and refresh your accounts.</p> : null}
      </section>

      <section aria-labelledby="daily-report-title" className="mt-7 rounded-xl border p-4">
        <h2 className="font-medium text-sm" id="daily-report-title">Daily posting report</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opt in to a daily summary at your verified sign-in email through connected Gmail. A scheduled report dispatcher must also be configured before delivery is active.
        </p>
        {reportError ? <p className="mt-3 text-sm text-destructive" role="alert">{reportError}</p> : null}
        {reportLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading report settings…</p>
        ) : !reportData?.gmailConfigured ? (
          <p className="mt-3 text-sm text-muted-foreground">Gmail report delivery is not configured for this deployment.</p>
        ) : !reportData.emailVerified ? (
          <p className="mt-3 text-sm text-muted-foreground">Verify your sign-in email before enabling daily reports.</p>
        ) : !reportData.gmailConnected ? (
          <p className="mt-3 text-sm text-muted-foreground">Connect Gmail above to turn on reports for {reportData.email}.</p>
        ) : (
          <label className="mt-4 flex items-center gap-3 text-sm">
            <input
              checked={reportData.enabled}
              disabled={reportSaving}
              onChange={(event) => void setDailyReports(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>{reportSaving ? "Saving…" : `Opt in to daily reports for ${reportData.email}`}</span>
          </label>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Reports cover actions Meliza records and may not confirm final delivery by a social platform. Turn this off any time.
        </p>
      </section>

      <PackageSettings />

      <footer className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Link className="text-sm text-muted-foreground underline underline-offset-4" href="https://composio.dev/auth" rel="noreferrer" target="_blank">How account authorization works</Link>
        <Button onClick={() => void refresh()} variant="outline">Refresh accounts</Button>
      </footer>
    </div>
  );
}
