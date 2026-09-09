import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "fitness-neu:install-hint-dismissed";

/** Chrome/Edge feuern dieses Event; es ist (noch) nicht in lib.dom typisiert. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS meldet den Standalone-Modus ausschliesslich hierueber.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Privater Modus o. Ä.: dann lieber nichts anzeigen als zu stören.
    return true;
  }
}

/**
 * Hinweis zum Installieren auf dem Home-Bildschirm.
 *
 * Android/Chrome bekommen den echten Installationsdialog, iOS eine Anleitung –
 * dort gibt es keine programmatische Installation.
 */
export function InstallHint() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone() || readDismissed()) return;
    setDismissed(false);
    if (isIos()) setShowIosHint(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* nicht kritisch */
    }
  }

  if (dismissed || (!prompt && !showIosHint)) return null;

  return (
    <div className="relative flex items-start gap-3 rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3">
      <Share className="mt-0.5 h-5 w-5 shrink-0 text-orange-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Als App installieren</p>
        {prompt ? (
          <>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Schnellerer Start, eigener Vollbildmodus und offline nutzbar.
            </p>
            <Button
              className="mt-2"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setPrompt(null);
                dismiss();
              }}
            >
              Installieren
            </Button>
          </>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            In Safari auf „Teilen“ tippen und „Zum Home-Bildschirm“ wählen.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hinweis ausblenden"
        className="-mt-1.5 -mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
