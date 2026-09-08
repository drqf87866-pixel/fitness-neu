import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" && "bg-orange-500/15 text-orange-300",
        variant === "outline" && "border border-border text-muted-foreground",
        variant === "success" && "bg-emerald-500/15 text-emerald-300",
        className,
      )}
      {...props}
    />
  );
}
