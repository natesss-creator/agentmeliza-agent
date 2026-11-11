"use client";

import { LogOutIcon, UserRoundPlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { SocialConnectionsDialog } from "@/app/settings/connections/social-connections";
import { FeatureCards } from "./feature-guide";

const AGENT_NAME = "Meliza";

export function SignIn({ callbackURL = "/" }: { readonly callbackURL?: string } = {}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn() {
    setPending(true);
    setError(undefined);
    try {
      const result = await authClient.signIn.social({ callbackURL, provider: "google" });
      if (!result.error) return;
      setPending(false);
      setError("Sign-in failed. Try again.");
    } catch {
      setPending(false);
      setError("Sign-in failed. Try again.");
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-center">
        <div className="flex w-full flex-col gap-5 lg:sticky lg:top-8">
          <div className="text-foreground opacity-[0.08] dark:opacity-[0.12]"><EveWordmark className="h-auto w-[4.875rem]" /></div>
          <section aria-label="Sign in" className="flex flex-col gap-2">
            <h1 className="max-w-full break-words font-medium text-sm leading-6">{AGENT_NAME}</h1>
            <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm leading-6">
              <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />Ready</span>
              <span aria-hidden="true" className="text-border">/</span>
              <span>Sign in to start a session</span>
            </p>
            <Button className="mt-3 w-full gap-2 text-sm" disabled={pending} onClick={signIn}>
              <svg aria-hidden="true" className="size-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.2C12.43 13.2 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.93c-.58 2.96-2.26 5.47-4.76 7.16l7.73 6C44.4 38.05 46.98 31.9 46.98 24.55Z" />
                <path fill="#FBBC05" d="M10.53 28.58A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.58l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.9.93 7.6 2.57 10.78l7.96-6.2Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.73-6c-2.15 1.45-4.9 2.32-8.17 2.32-6.26 0-11.57-3.7-13.47-8.93l-7.98 6.2C6.51 43.62 14.62 48 24 48Z" />
              </svg>
              <span className="leading-5">{pending ? "Redirecting…" : "Continue with Google"}</span>
            </Button>
            {error ? <p className="text-destructive text-sm" role="alert">{error}</p> : null}
          </section>
          <p className="text-sm text-muted-foreground">
            Google sign-in creates your private Meliza account. Then connect each social platform you want to use; Google sign-in does not authorize those accounts automatically.
          </p>
        </div>
        <section aria-labelledby="signin-features-title" className="min-w-0">
          <h2 className="mb-1 text-xl font-semibold tracking-tight" id="signin-features-title">What Meliza can help with</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Feature examples are starting points, not automatic actions. Publishing depends on authorization, connected accounts, and safety checks.
          </p>
          <div className="max-h-[60dvh] overflow-y-auto pr-1">
            <FeatureCards />
          </div>
        </section>
      </div>
    </main>
  );
}

function EveWordmark({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 169 53" xmlns="http://www.w3.org/2000/svg">
      <path d="M169 8.47h-51.39L81.73 53H70.36L113 0H169zM169 44.51v8.47h-45.87V44.5zM45.87 52.98H0V44.5h45.87zM38.66 30.55H0v-8.47h38.66z" fill="currentColor" />
      <path d="M169 30.55h-38.66v-8.47H169zM75.52 8.47H0V0h75.52z" fill="currentColor" />
    </svg>
  );
}

export function AccountControl({ email, image, name }: {
  readonly email: string;
  readonly image?: string | null;
  readonly name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const initials = getInitials(name, email);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onError: () => setPending(false),
          onSuccess: () => window.location.assign("/"),
        },
      });
    } catch {
      setPending(false);
    }
  }

  return (
    <>
      <div className="fixed top-3 left-4 z-30 flex h-8 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Open account menu for ${name}`} className="relative size-7 cursor-pointer overflow-hidden rounded-full p-0" size="icon-sm" variant="ghost">
              {image && !imageFailed ? <img alt="" className="size-full object-cover" onError={() => setImageFailed(true)} src={image} /> : <span aria-hidden="true" className="font-medium text-xs">{initials}</span>}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-black/20 dark:border-white/25" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <div className="min-w-0 px-2 py-1.5 text-sm">
              <span className="block truncate font-medium leading-5" title={name}>{name}</span>
              <span className="block truncate text-muted-foreground leading-5" title={email}>{email}</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onSelect={() => setConnectionsOpen(true)}>
              Social accounts
              <UserRoundPlusIcon aria-hidden="true" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer justify-between" disabled={pending} onSelect={signOut}>
              {pending ? "Logging out…" : "Log out"}<LogOutIcon aria-hidden="true" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SocialConnectionsDialog open={connectionsOpen} onClose={() => setConnectionsOpen(false)} />
    </>
  );
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  return (parts[0]?.[0] ?? email[0] ?? "?").toUpperCase();
}
