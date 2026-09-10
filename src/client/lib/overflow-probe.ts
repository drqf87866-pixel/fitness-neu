/**
 * Findet heraus, welches Element den Viewport seitlich sprengt.
 *
 * Zwei Anläufe gegen den horizontalen Scrollbalken auf dem Handy (min-w-0 in
 * den Input-Primitives, Zoom-Reset bei Routenwechseln) haben nicht gereicht,
 * und am Desktop lässt sich das Problem nicht reproduzieren – rechnerisch
 * überläuft bei 360px kein Element. Statt ein drittes Mal zu raten, misst
 * diese Probe direkt auf dem Gerät.
 *
 * In dev läuft sie automatisch und meldet sich über console.warn. In jedem
 * Build lässt sie sich mit `?debug=overflow` einschalten und rendert ihr
 * Ergebnis in ein Panel – auf dem Handy gibt es keine DevTools.
 */

const PANEL_ID = "overflow-probe-panel";

export type OverflowHit = {
  label: string;
  left: number;
  right: number;
  width: number;
};

export type OverflowReport = {
  hits: OverflowHit[];
  /** Gerätekontext. Ist scrollWidth === clientWidth und die Seite trotzdem
   *  verschoben, liegt es am hängenden Layout-Viewport, nicht am DOM. */
  context: Record<string, string | number>;
};

/** Kurzes, wiedererkennbares Label – Tag plus die ersten Klassen. */
function describe(element: Element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const raw = typeof element.className === "string" ? element.className : "";
  const classes = raw.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const suffix = raw.trim().split(/\s+/).filter(Boolean).length > 6 ? "…" : "";
  return `${tag}${id}${classes.length ? `.${classes.join(".")}` : ""}${suffix}`;
}

function cssEnv(side: "left" | "right") {
  const probe = document.createElement("div");
  probe.style.cssText = `position:absolute;visibility:hidden;width:env(safe-area-inset-${side},0px)`;
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().width;
  probe.remove();
  return Math.round(value);
}

export function reportOverflow(): OverflowReport {
  const root = document.documentElement;
  const limit = root.clientWidth;

  const panel = document.getElementById(PANEL_ID);
  const offenders: Element[] = [];
  for (const element of document.body.querySelectorAll("*")) {
    // Das eigene Panel darf nicht im eigenen Bericht auftauchen.
    if (panel?.contains(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.right <= limit + 1 && rect.left >= -1) continue;
    offenders.push(element);
  }

  // Nur den äußersten Treffer je Kette melden – sonst listet ein einziger
  // zu breiter Container gleich seinen halben Teilbaum mit.
  const outermost = offenders.filter(
    (element) => !offenders.some((other) => other !== element && other.contains(element)),
  );

  const hits = outermost
    .map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: describe(element),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    })
    .sort((a, b) => b.right - a.right);

  const visual = window.visualViewport;
  return {
    hits,
    context: {
      "html.scrollWidth": root.scrollWidth,
      "html.clientWidth": limit,
      "window.innerWidth": window.innerWidth,
      "screen.width": window.screen.width,
      devicePixelRatio: window.devicePixelRatio,
      "visualViewport.width": visual ? Math.round(visual.width) : "n/a",
      "visualViewport.scale": visual ? Number(visual.scale.toFixed(3)) : "n/a",
      "visualViewport.offsetLeft": visual ? Math.round(visual.offsetLeft) : "n/a",
      "safe-area-left": cssEnv("left"),
      "safe-area-right": cssEnv("right"),
    },
  };
}

function formatReport(report: OverflowReport) {
  const lines = Object.entries(report.context).map(([key, value]) => `${key}: ${value}`);
  lines.push("");
  if (report.hits.length === 0) {
    lines.push("Kein Element ragt aus dem Viewport.");
    lines.push("→ scrollWidth === clientWidth? Dann hängt der Layout-Viewport (Zoom).");
  } else {
    lines.push(`${report.hits.length} Element(e) außerhalb:`);
    for (const hit of report.hits) {
      lines.push(`  right=${hit.right} (w=${hit.width}) ${hit.label}`);
    }
  }
  return lines.join("\n");
}

/** Panel für die Diagnose auf dem Handy (?debug=overflow). */
function renderPanel(report: OverflowReport) {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.cssText = [
    "position:fixed",
    "inset:0 0 auto 0",
    "z-index:9999",
    "max-height:60dvh",
    "overflow:auto",
    "padding:8px 10px",
    "background:#111",
    "color:#0f0",
    "font:11px/1.45 ui-monospace,monospace",
    "border-bottom:1px solid #0f0",
  ].join(";");

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Overflow-Probe schließen");
  close.style.cssText =
    "position:sticky;top:0;float:right;width:32px;height:32px;background:#0f0;color:#111;border:0;font:16px/1 monospace";
  close.onclick = () => panel.remove();

  const text = document.createElement("div");
  text.style.cssText = "white-space:pre-wrap;word-break:break-all";
  text.textContent = formatReport(report);

  panel.appendChild(close);
  panel.appendChild(text);
  document.body.appendChild(panel);
}

let scheduled = 0;

/** Misst jetzt und nach jedem Resize (Rotation, Tastatur, Zoom). */
export function startOverflowProbe({ panel = false } = {}) {
  const run = () => {
    const report = reportOverflow();
    if (panel) renderPanel(report);
    if (report.hits.length > 0) {
      console.warn(`[overflow-probe]\n${formatReport(report)}`);
    }
  };

  const schedule = () => {
    window.clearTimeout(scheduled);
    scheduled = window.setTimeout(run, 200);
  };

  schedule();
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
}
