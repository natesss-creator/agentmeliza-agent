"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <button
          className="rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-lg hover:bg-muted"
          onClick={install}
          type="button"
        >
          Install Meliza
        </button>
      </div>
      {showHelp && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowHelp(false)}
          role="presentation"
        >
          <section
            aria-labelledby="install-help-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-xl border bg-background p-6 text-foreground shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <h2 className="text-lg font-semibold" id="install-help-title">
              Install Meliza
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              If your browser supports app installation, use its menu to choose
              “Install app” or “Add to Home Screen.” On iPhone or iPad, open the
              Share menu in Safari and tap “Add to Home Screen.”
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Installation requires a supported browser and a secure connection.
              Meliza still needs an internet connection to use its AI features.
            </p>
            <button
              className="mt-5 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setShowHelp(false)}
              type="button"
            >
              Close
            </button>
          </section>
        </div>
      )}
    </>
  );
}
