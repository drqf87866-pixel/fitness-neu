import { type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        // min-w-0 wie beim Input: cols=20 wirkt sonst als intrinsische Mindestbreite.
        "min-h-28 w-full min-w-0 rounded-lg border border-input bg-muted px-3 py-2 text-sm outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  );
}
