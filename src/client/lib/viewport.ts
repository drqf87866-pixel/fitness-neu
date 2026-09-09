let pendingRestore = false;

/**
 * iOS/Android-Browser (besonders installierte PWAs) merken sich einen einmal
 * gesetzten Pinch-/Fokus-Zoom-Level auch über App-Neustarts, SPA-Routenwechsel
 * und Fortsetzen aus dem Hintergrund hinweg. Ein kurzes Togglen des
 * Viewport-Meta-Tags zwingt die Renderengine, den Layout-Viewport neu zu
 * berechnen und auf initial-scale zurückzuspringen – ohne Pinch-Zoom
 * dauerhaft zu deaktivieren.
 *
 * Wird bei App-Start, beim Wiederaufwachen und bei jedem Routenwechsel
 * aufgerufen, da der Zoom sonst zwischen Seiten „mitgeschleppt“ wird und die
 * Seite breiter als der Viewport erscheint (horizontaler Scrollbalken).
 */
export function resetViewportZoom() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const original = meta.getAttribute("content");
  if (!original) return;
  // Läuft ein Toggle noch, übernimmt dessen Restore die Rücksetzung ohnehin.
  if (pendingRestore) return;
  pendingRestore = true;

  const restore = () => {
    meta.setAttribute("content", original);
    pendingRestore = false;
  };

  meta.setAttribute("content", `${original}, maximum-scale=1`);
  // Doppeltes rAF: erst nach zwei Frames hat die Engine das Meta-Tag sicher
  // übernommen; ein einzelnes rAF kann vor dem Layout-Flush feuern und den
  // Reset wirkungslos machen.
  requestAnimationFrame(() => {
    requestAnimationFrame(restore);
  });
  // Sicherheitsnetz: rAF läuft in Hintergrund-Tabs nicht.
  window.setTimeout(() => {
    if (pendingRestore) restore();
  }, 150);
}
