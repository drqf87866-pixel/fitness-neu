import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Ersetzt `window.confirm`: gleiche Semantik (await → true/false), aber im
 * App-Design und als Bottom-Sheet mit vollwertigen Touch-Zielen.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      // Ein bereits wartender Aufruf wird abgelehnt, statt hängen zu bleiben.
      resolver.current?.(false);
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((confirmed: boolean) => {
    setOptions(null);
    const resolve = resolver.current;
    resolver.current = null;
    resolve?.(confirmed);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={options !== null}
        onClose={() => settle(false)}
        title={options?.title ?? ""}
        footer={
          <div className="grid gap-2">
            <Button
              size="lg"
              variant={options?.destructive ? "destructive" : "default"}
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Bestätigen"}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => settle(false)}>
              {options?.cancelLabel ?? "Abbrechen"}
            </Button>
          </div>
        }
      >
        {options?.description ? (
          <div className="pb-2 text-sm text-muted-foreground">{options.description}</div>
        ) : null}
      </Sheet>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm benötigt einen <ConfirmProvider> im Baum.");
  return confirm;
}
