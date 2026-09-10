import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { flushOfflineQueue } from "./lib/sync";
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
