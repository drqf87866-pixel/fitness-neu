/**
 * Signale am Ende der Satzpause.
 *
 * Browser erlauben Ton und Benachrichtigungs-Anfrage nur nach einer
 * Nutzeraktion. Der Timer läuft aber ohne Geste ab – deshalb entsperrt
 * `unlockAlerts()` beides beim Abhaken eines Satzes, und das Pausenende
 * nutzt nur noch den bereits freigegebenen Kontext.
 */

let audio: AudioContext | null = null;

/** Innerhalb einer Nutzeraktion aufrufen (z. B. Satz abhaken). */
export function unlockAlerts() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    audio = null;
  }
  if ("Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => {});
  }
}

export function beep() {
  const ctx = audio;
  if (!ctx || ctx.state === "closed") return;
  try {
    // Nach Hintergrund/Anruf kann das System den Kontext pausiert haben.
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    /* Audio nicht verfügbar – Vibration und Hinweis reichen */
  }
}

/**
 * Benachrichtigung über den Service Worker: Chrome auf Android wirft beim
 * `new Notification()`-Konstruktor, dort geht nur `showNotification`.
 */
export function notify(title: string, body: string) {
  navigator.vibrate?.([200, 80, 200]);
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const fallback = () => {
    try {
      new Notification(title, { body });
    } catch {
      /* Safari wirft hier in manchen Standalone-Kontexten */
    }
  };
  if (!("serviceWorker" in navigator)) {
    fallback();
    return;
  }
  navigator.serviceWorker.ready
    .then((registration) => registration.showNotification(title, { body, tag: "rest-timer" }))
    .catch(fallback);
}
