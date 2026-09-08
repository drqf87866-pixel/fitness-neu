import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ts: number) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
}

export function formatDay(ts: number) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(ts),
  );
}
