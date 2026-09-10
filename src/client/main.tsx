import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { syncOverflowDebugFromQuery } from "./lib/debug-flag";
import { flushOfflineQueue } from "./lib/sync";
import "./index.css";

registerSW({ immediate: true });

function Root() {
  // Horizontaler Overflow ist auf dem Handy schwer zu fassen und am Desktop
  // nicht reproduzierbar – die Probe benennt den Verursacher direkt am Gerät.
  // Das Flag muss localStorage überleben: Die installierte PWA startet im
  // Standalone-Modus ohne Adressleiste, dort lässt sich ?debug=overflow gar
  // nicht eintippen – genau dort tritt der Fehler aber auf. Einmal in einem
  // Browser-Tab gesetzt, bleibt die Diagnose also auch in der PWA aktiv.
  useEffect(() => {
    const wantsPanel = syncOverflowDebugFromQuery();
    if (!import.meta.env.DEV && !wantsPanel) return;
    void import("./lib/overflow-probe").then(({ startOverflowProbe }) =>
      startOverflowProbe({ panel: wantsPanel }),
    );
  }, []);

  useEffect(() => {
    void flushOfflineQueue();
    const onOnline = () => {
      void flushOfflineQueue();
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
