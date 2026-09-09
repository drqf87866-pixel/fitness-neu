import { type HTMLAttributes, type ReactNode, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Dialog ist die schlanke Hülle um {@link Sheet}. Auf dem Handy erscheint der
 * Inhalt als Bottom-Sheet, ab `sm` als zentriertes Modal. Fokusfalle,
 * Escape, Scroll-Lock und Android-Zurück kommen aus Sheet.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} footer={footer}>
      {children}
    </Sheet>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "min-h-[40px] flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            value === tab.id ? "bg-card text-foreground" : "text-muted-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function useDialog() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}
