import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-orange-400",
        secondary: "bg-secondary text-secondary-foreground hover:bg-neutral-800",
        outline: "border border-border bg-transparent hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-red-600",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    /** Zeigt einen Spinner, sperrt den Knopf und lässt ihn dabei voll sichtbar. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  disabled,
  loading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      // tailwind-merge behält den späteren disabled:opacity-Wert – ein ladender
      // Knopf soll nicht auf die Hälfte heruntergedimmt werden.
      className={cn(
        buttonVariants({ variant, size }),
        loading && "disabled:opacity-100",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : null}
      {children}
    </button>
  );
}
