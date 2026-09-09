import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import { flushOfflineQueue } from "./lib/sync";
import "./index.css";

registerSW({ immediate: true });

// iOS/Android-Browser (besonders installierte PWAs) merken sich einen einmal
// gesetzten Pinch-Zoom-Level auch über App-Neustarts/Fortsetzen aus dem
// Hintergrund hinweg. Ein kurzes Toggle der Viewport-Meta-Tag zwingt die
// Renderengine, den Layout-Viewport neu zu berechnen und auf initial-scale
// zurückzuspringen, ohne Pinch-Zoom dauerhaft zu deaktivieren.
function resetViewportZoom() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.getAttribute("content");
  if (!original) return;
  meta.setAttribute("content", `${original}, maximum-scale=1`);
  requestAnimationFrame(() => {
    meta.setAttribute("content", original);
  });
}

function Root() {
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
