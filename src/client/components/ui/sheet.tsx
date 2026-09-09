import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Verschachtelte Sheets sollen den Body-Scroll nur einmal freigeben. */
let openSheetCount = 0;

/**
 * Verschachtelte Sheets (z. B. Optionsmenü → Bestätigung) bilden einen
 * gemeinsamen Stapel mit genau EINEM History-Eintrag statt einem pro Sheet.
 * Schließen mehrere Sheets im selben Zug (z. B. Confirm bestätigen, das
 * danach auch das Menü zumacht), würde ein Eintrag pro Sheet zwei
 * `history.back()`-Aufrufe kurz hintereinander auslösen – das kann in
 * mobilen WebViews zu einem spürbaren Hänger führen. Android-Zurück schließt
 * immer nur das oberste Sheet im Stapel; bleiben danach weitere offen, wird
 * sofort ein neuer Eintrag für den Rest-Stapel nachgeschoben.
 */
const sheetStack: Array<() => void> = [];
let stackOwnsHistoryEntry = false;
let stackPoppedByUser = false;

function pushStackHistoryEntry() {
  window.history.pushState({ ...window.history.state, sheetMarker: "sheet-stack" }, "");
  stackOwnsHistoryEntry = true;
  stackPoppedByUser = false;
}

function onStackPopState() {
  stackOwnsHistoryEntry = false;
  stackPoppedByUser = true;
  sheetStack[sheetStack.length - 1]?.();
}

function lockBodyScroll() {
  openSheetCount += 1;
  document.body.dataset.sheetOpen = "true";
}

function unlockBodyScroll() {
  openSheetCount = Math.max(0, openSheetCount - 1);
  if (openSheetCount === 0) delete document.body.dataset.sheetOpen;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Ab dieser Zugdistanz (px) schließt die Wischgeste das Sheet. */
const DISMISS_THRESHOLD = 96;

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Fixierte Aktionsleiste am unteren Rand, außerhalb des Scrollbereichs. */
  footer?: ReactNode;
  /** Sheet auf volle Höhe ziehen – für lange Listen wie den Übungs-Picker. */
  full?: boolean;
  /** Android-Zurück schließt das Sheet statt die Seite zu verlassen. */
  closeOnBack?: boolean;
  className?: string;
};

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  full = false,
  closeOnBack = true,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // onClose wird in Effects gebraucht, soll sie aber nicht neu starten.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  // Fokus setzen und beim Schließen zurückgeben
  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const restore = previousFocus.current;
    return () => restore?.focus?.();
  }, [open]);

  // Body-Scroll sperren
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [open]);

  // Escape und Fokusfalle
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Hardware-Zurück (Android) schließt das Sheet. Der bestehende Router-State
  // wird mitgenommen, damit react-router seinen Eintrag behält.
  useEffect(() => {
    if (!open || !closeOnBack) return;
    const close = () => onCloseRef.current();
    sheetStack.push(close);
    if (sheetStack.length === 1) {
      window.addEventListener("popstate", onStackPopState);
      pushStackHistoryEntry();
    }

    return () => {
      const index = sheetStack.lastIndexOf(close);
      if (index !== -1) sheetStack.splice(index, 1);

      if (sheetStack.length > 0) {
        // Weitere Sheets im Stapel offen (z. B. Menü unter der gerade
        // geschlossenen Bestätigung). War der Eintrag gerade erst per
        // Zurück-Geste konsumiert, braucht der Rest-Stapel einen neuen,
        // damit ein erneutes Zurück auch das nächste Sheet schließt statt
        // die Seite zu verlassen.
        if (stackPoppedByUser && !stackOwnsHistoryEntry) pushStackHistoryEntry();
        return;
      }

      window.removeEventListener("popstate", onStackPopState);
      if (stackOwnsHistoryEntry && !stackPoppedByUser) {
        stackOwnsHistoryEntry = false;
        window.history.back();
      }
      stackPoppedByUser = false;
    };
  }, [open, closeOnBack]);

  const endDrag = useCallback(() => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDragY((current) => {
      if (current > DISMISS_THRESHOLD) onCloseRef.current();
      return 0;
    });
  }, []);

  if (!open) return null;

  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStart.current));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
        className={cn(
          "relative flex w-full animate-sheet-in flex-col rounded-t-2xl border border-border bg-card outline-none",
          "sm:max-w-md sm:rounded-2xl",
          full ? "h-[92dvh]" : "max-h-[90dvh]",
          !dragY && "transition-transform duration-200",
          className,
        )}
      >
        <div
          className="shrink-0 cursor-grab touch-none px-4 pt-2 active:cursor-grabbing"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden="true" />
          <div className="mt-2 mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto px-4", !footer && "pb-safe")}>
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border px-4 pt-3 pb-safe">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
