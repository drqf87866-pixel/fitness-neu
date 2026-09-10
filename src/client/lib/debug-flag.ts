/**
 * Schalter für die Overflow-Probe (`lib/overflow-probe.ts`).
 *
 * Das Flag lebt in localStorage, weil die installierte PWA im Standalone-Modus
 * keine Adressleiste hat: `?debug=overflow` lässt sich dort gar nicht eintippen
 * – und genau dort tritt der abgeschnittene Plan-Editor auf. Einmal gesetzt
 * (per Query-String in einem Browser-Tab oder über den Schalter im Profil),
 * bleibt die Diagnose auch über PWA-Starts hinweg aktiv.
 */
const KEY = "fitness-neu:debug-overflow";

export function isOverflowDebugEnabled() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    // Privater Modus o. ä.
    return false;
  }
}

export function setOverflowDebug(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(KEY, "1");
    else window.localStorage.removeItem(KEY);
  } catch {
    // Ohne localStorage bleibt nur der Query-String dieser Sitzung.
  }
}

/**
 * Wendet `?debug=overflow` bzw. `?debug=off` an und liefert den daraus
 * folgenden Zustand. Wird einmal beim Start gerufen.
 */
export function syncOverflowDebugFromQuery() {
  const param = new URLSearchParams(window.location.search).get("debug");
  if (param === "overflow") setOverflowDebug(true);
  if (param === "off") setOverflowDebug(false);
  return isOverflowDebugEnabled() || param === "overflow";
}
