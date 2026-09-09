import { type HTMLAttributes, type Ref } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  compact?: boolean;
  /** React 19 reicht ref als normales Prop durch – wird für Auto-Scroll gebraucht. */
  ref?: Ref<HTMLDivElement>;
};

export function Card({ className, compact, ref, ...props }: CardProps) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border bg-card",
        compact ? "p-3" : "p-4",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("text-base font-semibold", className)} {...props} />;
}
