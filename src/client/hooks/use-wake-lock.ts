import { useEffect } from "react";

/**
 * Hält das Display an, solange `active` gilt (Live-Training).
 * Fordert den Lock nach Tab-Wechsel oder Bildschirmsperre erneut an, da das
 * System ihn dabei freigibt. No-op, wo die API fehlt (u. a. iOS < 16.4).
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      if (released || sentinel || document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (released) {
          void lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        // Das System gibt den Lock beim Wegblenden selbst frei.
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        /* Akkusparmodus o. Ä. – Training funktioniert auch ohne Wake-Lock. */
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
