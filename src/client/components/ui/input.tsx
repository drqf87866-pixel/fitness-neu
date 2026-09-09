import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        // min-w-0: ein <input> ohne size-Attribut bringt ~20 Zeichen intrinsische
        // Mindestbreite mit und sprengt sonst als Grid-/Flex-Kind schmale Spalten.
        // text-base (16px): mobile Browser zoomen beim Fokus in Felder mit
        // kleinerer Schrift ein – der Zoom bleibt danach auf der Seite hängen.
        "h-10 w-full min-w-0 rounded-lg border border-input bg-muted px-3 text-base outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  );
}
