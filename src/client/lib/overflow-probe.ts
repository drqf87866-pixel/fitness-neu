/**
 * Findet heraus, welches Element den Viewport seitlich sprengt.
 *
 * Vier Anläufe gegen den abgeschnittenen Plan-Editor (min-w-0 in den
 * Input-Primitives, Zoom-Reset bei Routenwechseln, overflow-x:clip,
 * Sonner-Breite) gingen daneben, weil sie auf Rechnungen statt auf Messungen
 * beruhten: Die Handrechnung sagte "bei 360px passt alles", tatsächlich war die
 * Seite 380px breit. Der Unterschied steckte in den Min-Content-Beiträgen, die
 * man nicht im Kopf ausrechnet – man misst sie.
 *
 * Genau dafür ist diese Probe da. Die Vorfahrenkette unten ist der Kern: Sie
 * zeigt, auf welcher Ebene rect/scrollWidth vom clientWidth abweicht, und damit
 * das Element, das die Breite nach oben durchreicht.
 *
 * In dev läuft sie automatisch und meldet sich über console.warn. In jedem
 * Build lässt sie sich mit `?debug=overflow` einschalten (`?debug=off` schaltet
 * wieder ab) und rendert ihr Ergebnis in ein Panel – auf dem Handy gibt es
 * keine DevTools. Das Flag lebt in localStorage weiter, weil die installierte
 * PWA im Standalone-Modus keine Adressleiste für den Query-String hat.
 */

const PANEL_ID = "overflow-probe-panel";

export type OverflowHit = {
  label: string;
  left: number;
  right: number;
  width: number;
  /** Vorfahrenkette bis html – zeigt, welcher Container zu breit ist. */
  ancestors: string[];
};

export type OverflowReport = {
  hits: OverflowHit[];
  /** Gerätekontext, gezielt zum Trennen der offenen Hypothesen. */
  context: Record<string, string | number>;
};

/** Kurzes, wiedererkennbares Label – Tag plus die ersten Klassen. */
function describe(element: Element) {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const raw = typeof element.className === "string" ? element.className : "";
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  const classes = parts.slice(0, 6);
  const suffix = parts.length > 6 ? "…" : "";
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

/**
 * scrollWidth ohne den Clip messen.
 *
 * `html { overflow-x: clip }` (index.css) macht scrollWidth === clientWidth zur
 * Tautologie – der bisherige Leitindikator der Probe war damit tot, die beiden
 * Änderungen desselben Commits hoben sich gegenseitig auf. Wir heben den Clip
 * für die Messung kurz auf; das Lesen von scrollWidth erzwingt den Reflow noch
 * im selben Frame, gemalt wird der Zwischenstand nie.
 */
function rawScrollWidth() {
  const root = document.documentElement;
  const previous = root.style.overflowX;
  root.style.overflowX = "visible";
  const width = root.scrollWidth;
  root.style.overflowX = previous;
  // Erneut lesen, damit der Clip vor dem nächsten Paint wieder steht.
  void root.scrollWidth;
  return width;
}

/** Vorfahrenkette mit Breiten – benennt die Ursache, nicht nur das Symptom. */
function ancestorChain(element: Element) {
  const chain: string[] = [];
  let node: Element | null = element.parentElement;
  while (node) {
    const rect = node.getBoundingClientRect();
    chain.push(`${Math.round(rect.width)}px (client ${node.clientWidth}) ${describe(node)}`);
    node = node.parentElement;
  }
  return chain;
}

/**
 * Liegt das Element in einem Vorfahren, der seitlich abschneidet?
 *
 * getBoundingClientRect() kennt kein Clipping: Alles in einem `truncate`,
 * `.scroll-x` oder `overflow-hidden` meldet sich sonst als Treffer, obwohl es
 * den Dokumentrand gar nicht erreichen kann. Auf einer Seite voller `truncate`
 * ersäuft der echte Treffer sonst im Rauschen.
 */
function insideClippedAncestor(element: Element) {
  let node = element.parentElement;
  while (node && node !== document.body) {
    const overflowX = getComputedStyle(node).overflowX;
    if (overflowX !== "visible") return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Dateiname des App-Bundles – im Build der gehashte Asset-Name.
 *
 * Das ist der schnellste Beweis, ob auf dem Gerät überhaupt der aktuelle Stand
 * läuft: Passt der Hash nicht zum letzten Deploy, bedient noch der alte
 * Service Worker und jede weitere Layout-Analyse ist verschwendet. Die
 * Vite-eigenen Skripte werden ausgesiebt, in dev stünde sonst /@vite/client da.
 */
function entryScript() {
  const sources = Array.from(document.querySelectorAll("script[type=module][src]"))
    .map((script) => script.getAttribute("src") ?? "")
    .filter((src) => src && !src.startsWith("/@vite"));
  return sources[sources.length - 1] ?? "n/a";
}

const marked: Array<{ element: HTMLElement; previous: string }> = [];

function clearMarks() {
  for (const entry of marked) entry.element.style.outline = entry.previous;
  marked.length = 0;
}

/** Treffer direkt auf der Seite umranden – auf dem Handy sagt das mehr als jede Zahl. */
function markHits(elements: Element[]) {
  clearMarks();
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) continue;
    marked.push({ element, previous: element.style.outline });
    element.style.outline = "2px solid red";
  }
}

export function reportOverflow({ mark = false } = {}): OverflowReport {
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
    if (insideClippedAncestor(element)) continue;
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
        ancestors: ancestorChain(element),
      };
    })
    .sort((a, b) => b.right - a.right);

  if (mark) markHits(outermost);
  else clearMarks();

  const visual = window.visualViewport;
  const body = document.body.getBoundingClientRect();
  const viewportMeta = document.querySelector("meta[name=viewport]");
  return {
    hits,
    context: {
      route: window.location.pathname,
      "html.clientWidth": limit,
      "html.scrollWidth (geclippt)": root.scrollWidth,
      "html.scrollWidth (roh)": rawScrollWidth(),
      "body.width": Math.round(body.width),
      "body.right": Math.round(body.right),
      "window.innerWidth": window.innerWidth,
      "window.scrollX": Math.round(window.scrollX),
      "screen.width": window.screen.width,
      devicePixelRatio: window.devicePixelRatio,
      // Beweist, ob rem doch inflationiert ist (Android-Schriftskalierung).
      "root font-size": getComputedStyle(root).fontSize,
      // Beweist, ob die PWA noch eine veraltete, gecachte index.html ausliefert.
      "meta viewport": viewportMeta?.getAttribute("content") ?? "fehlt",
      standalone: window.matchMedia("(display-mode: standalone)").matches ? "ja" : "nein",
      // Beweist, welcher Build wirklich läuft. Passt der Hash nicht zum
      // Deploy, bedient noch der alte Service Worker – dann ist jede weitere
      // Layout-Analyse verschwendet.
      build: entryScript(),
      "service worker": navigator.serviceWorker?.controller?.scriptURL ?? "keiner",
      "visualViewport.width": visual ? Math.round(visual.width) : "n/a",
      "visualViewport.scale": visual ? Number(visual.scale.toFixed(3)) : "n/a",
      "visualViewport.offsetLeft": visual ? Math.round(visual.offsetLeft) : "n/a",
      "safe-area-left": cssEnv("left"),
      "safe-area-right": cssEnv("right"),
    },
  };
}

/**
 * Schmaler als jedes echte Handy in CSS-Pixeln. Wird der Layout-Viewport hier
 * unterschritten, ist nicht das CSS schuld, sondern der Seiten-Zoom von Chrome
 * (Einstellungen → Bedienungshilfen → Zoom bzw. Website-Einstellungen → Zoom)
 * oder ein geteilter Bildschirm. Das ist ein Layout-Zoom: Er lässt `rem` bei
 * 16px und `visualViewport.scale` bei 1, verkleinert aber clientWidth – und
 * `user-scalable=no` hält ihn nicht auf. Diese Zeile trennt die beiden Fälle,
 * damit niemand wieder im CSS sucht, wo nichts zu finden ist.
 */
const MIN_SANE_VIEWPORT = 320;

function verdict(report: OverflowReport) {
  const width = Number(report.context["html.clientWidth"]);
  if (width < MIN_SANE_VIEWPORT) {
    return `BEFUND: Layout-Viewport ${width}px – zu schmal (< ${MIN_SANE_VIEWPORT}px).
→ Seiten-Zoom in Chrome oder geteilter Bildschirm, nicht das CSS.`;
  }
  if (report.hits.length > 0) {
    return "BEFUND: echter DOM-Overflow – siehe Kette unten, das ^-Element ist die Ursache.";
  }
  return "BEFUND: unauffällig – nichts ragt heraus.";
}

function formatReport(report: OverflowReport) {
  const lines = [verdict(report), ""];
  for (const [key, value] of Object.entries(report.context)) lines.push(`${key}: ${value}`);
  lines.push("");
  if (report.hits.length === 0) {
    lines.push("Kein Element ragt aus dem Viewport.");
    lines.push("→ Ist scrollWidth (roh) größer als clientWidth, überläuft trotzdem");
    lines.push("  etwas – dann steht der Verursacher außerhalb von body oder ist fixed.");
  } else {
    lines.push(`${report.hits.length} Element(e) außerhalb:`);
    for (const hit of report.hits) {
      lines.push(`  right=${hit.right} (w=${hit.width}) ${hit.label}`);
      for (const ancestor of hit.ancestors) lines.push(`      ^ ${ancestor}`);
    }
  }
  return lines.join("\n");
}

/** Panel für die Diagnose auf dem Handy (?debug=overflow). */
function renderPanel(report: OverflowReport, onRemeasure: () => void) {
  document.getElementById(PANEL_ID)?.remove();

  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  // Unten statt oben: Ein Panel über den oberen 60% der Seite verdeckt genau
  // die Kacheln, die man begutachten will.
  panel.style.cssText = [
    "position:fixed",
    "inset:auto 0 0 0",
    "z-index:9999",
    "max-height:55dvh",
    "overflow:auto",
    "padding:8px 10px",
    "background:#111",
    "color:#0f0",
    "font:11px/1.45 ui-monospace,monospace",
    "border-top:1px solid #0f0",
  ].join(";");

  const controls = document.createElement("div");
  controls.style.cssText = "position:sticky;top:0;float:right;display:flex;gap:6px";

  const remeasure = document.createElement("button");
  remeasure.type = "button";
  remeasure.textContent = "Neu messen";
  remeasure.style.cssText =
    "height:32px;padding:0 8px;background:#0f0;color:#111;border:0;font:11px/1 monospace";
  remeasure.onclick = onRemeasure;

  // Einen mehrzeiligen Bericht vom Handydisplay abzutippen ist zwecklos.
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Kopieren";
  copy.style.cssText =
    "height:32px;padding:0 8px;background:#0f0;color:#111;border:0;font:11px/1 monospace";
  copy.onclick = () => {
    void navigator.clipboard?.writeText(formatReport(report)).then(
      () => (copy.textContent = "Kopiert"),
      () => (copy.textContent = "Fehlgeschlagen"),
    );
  };

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Overflow-Probe schließen");
  close.style.cssText =
    "width:32px;height:32px;background:#0f0;color:#111;border:0;font:16px/1 monospace";
  close.onclick = () => {
    clearMarks();
    panel.remove();
  };

  // append(...) kollidiert mit den Workers-Typen im selben tsconfig.
  controls.appendChild(remeasure);
  controls.appendChild(copy);
  controls.appendChild(close);

  const text = document.createElement("div");
  text.style.cssText = "white-space:pre-wrap;word-break:break-all";
  text.textContent = formatReport(report);

  panel.appendChild(controls);
  panel.appendChild(text);
  document.body.appendChild(panel);
}

let scheduled = 0;
let started = false;

/**
 * Misst jetzt, nach jedem Resize (Rotation, Tastatur, Zoom) und – neu – nach
 * jeder DOM-Änderung unter #root. Die alte Fassung lief einmal 200ms nach Mount
 * und danach nur noch bei resize: In einer SPA hat sie den Plan-Editor damit
 * vermutlich nie zu sehen bekommen, weil dessen Kacheln erst rendern, wenn die
 * plans-Query aufgelöst ist.
 */
export function startOverflowProbe({ panel = false } = {}) {
  if (started) return;
  started = true;

  const run = () => {
    const report = reportOverflow({ mark: panel });
    if (panel) renderPanel(report, run);
    if (report.hits.length > 0) {
      console.warn(`[overflow-probe]\n${formatReport(report)}`);
    }
  };

  const schedule = () => {
    window.clearTimeout(scheduled);
    scheduled = window.setTimeout(run, 250);
  };

  schedule();
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("resize", schedule);

  // Das Panel und die roten Umrandungen sind selbst DOM-Änderungen – sie
  // liegen aber außerhalb von #root bzw. sind reine Style-Attribute, lösen
  // also keine Endlosschleife über den MutationObserver aus.
  const root = document.getElementById("root");
  if (root) {
    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  }
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(schedule).observe(document.body);
  }
}
