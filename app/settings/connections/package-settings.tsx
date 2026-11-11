"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type PackageData = {
  userId: string;
  assignment: { packageId: "starter"; assignedAt: string } | null;
  seller: boolean;
  package: { id: "starter"; name: string; price: string; postsPerDay: number };
};

export function PackageSettings() {
  const [data, setData] = useState<PackageData>();
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    setError(undefined);
    try {
      const response = await fetch("/api/meliza/package", { cache: "no-store" });
      const body = (await response.json()) as PackageData & { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not load package settings.");
      setData(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load package settings.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function assign(packageId: "starter" | null) {
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const response = await fetch("/api/meliza/package", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: userId.trim(), packageId }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not update package assignment.");
      setMessage(packageId ? "Starter package assigned." : "Package assignment removed.");
      setUserId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update package assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="package-title" className="mt-7 rounded-xl border p-4">
      <h2 className="font-medium text-sm" id="package-title">Usage package</h2>
      {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {!data && !error ? <p className="mt-3 text-sm text-muted-foreground">Loading package settings…</p> : null}
      {data ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account ID: <code className="break-all">{data.userId}</code>
          </p>
          <p className="mt-2 text-sm">
            {data.assignment
              ? `${data.package.name} (${data.package.price}) — ${data.package.postsPerDay} social posts per UTC day.`
              : "No package is assigned. Social publishing tools remain unavailable until the seller assigns a package."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Only Starter is active. Replies are not sent automatically; paid ads always require explicit per-campaign approval.
          </p>
          {data.seller ? (
            <div className="mt-4 border-t pt-4">
              <label className="block text-sm font-medium" htmlFor="package-user-id">Assign Starter by user ID</label>
              <input
                autoComplete="off"
                className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                id="package-user-id"
                maxLength={128}
                onChange={(event) => setUserId(event.currentTarget.value)}
                placeholder="Paste the user ID shown in their settings"
                value={userId}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={busy || !userId.trim()} onClick={() => void assign("starter")} size="sm">
                  Assign Starter
                </Button>
                <Button disabled={busy || !userId.trim()} onClick={() => void assign(null)} size="sm" variant="outline">
                  Remove package
                </Button>
              </div>
              {message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
              <p className="mt-3 text-xs text-muted-foreground">
                Assign packages only after confirming the customer’s subscription. Higher tiers are not configured.
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
