import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { flushOfflineQueue } from "./lib/sync";
import { resetViewportZoom } from "./lib/viewport";
import "./index.css";

registerSW({ immediate: true });

function Root() {
  // Horizontaler Overflow ist auf dem Handy schwer zu fassen und am Desktop
  // nicht reproduzierbar – die Probe benennt den Verursacher direkt am Gerät.
  useEffect(() => {
    const wantsPanel = new URLSearchParams(window.location.search).get("debug") === "overflow";
    if (!import.meta.env.DEV && !wantsPanel) return;
    void import("./lib/overflow-probe").then(({ startOverflowProbe }) =>
      startOverflowProbe({ panel: wantsPanel }),
    );
  }, []);

  useEffect(() => {
    void flushOfflineQueue();
    resetViewportZoom();
    const onOnline = () => {
      void flushOfflineQueue();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetViewportZoom();
      }
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
