import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { clearAllLocalData } from "./db";
import { clearDeadLetters } from "./sync";
import type { UserProfile } from "@shared/types";

type AuthResponse = { user: UserProfile };

const LAST_USER_KEY = "fitness-neu:last-user";

/**
 * Entfernt alles Nutzerbezogene vom Gerät: lokale Trainings, Sync-Reste und
 * den vom Service Worker gecachten Übungskatalog (enthält eigene Übungen).
 */
async function clearDeviceData() {
  await clearAllLocalData().catch(() => {});
  clearDeadLetters();
  if ("caches" in window) {
    const keys = await caches.keys().catch(() => [] as string[]);
    await Promise.all(
      keys.filter((key) => key.startsWith("exercises")).map((key) => caches.delete(key)),
    );
  }
}

/** Meldet sich ein anderes Konto an als zuletzt, dürfen dessen Daten nicht sichtbar bleiben. */
async function onSignedIn(userId: string) {
  let last: string | null = null;
  try {
    last = localStorage.getItem(LAST_USER_KEY);
    localStorage.setItem(LAST_USER_KEY, userId);
  } catch {
    /* privater Modus */
  }
  if (last && last !== userId) await clearDeviceData();
}

export function useAuthQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await api<AuthResponse>("/api/auth/me");
      await onSignedIn(data.user.id);
      return data;
    },
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async (data) => {
      await onSignedIn(data.user.id);
      queryClient.setQueryData(["me"], data);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; name: string; password: string }) =>
      api<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: async (data) => {
      await onSignedIn(data.user.id);
      queryClient.setQueryData(["me"], data);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await clearDeviceData();
      try {
        localStorage.removeItem(LAST_USER_KEY);
      } catch {
        /* privater Modus */
      }
      queryClient.clear();
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      targetGoal?: string | null;
      weightKg?: number | null;
      experienceLevel?: "beginner" | "intermediate" | "advanced" | null;
      calorieTarget?: number | null;
      unit?: "kg" | "lbs";
    }) => api<AuthResponse>("/api/profile", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      api<{ ok: boolean }>("/api/profile/password", { method: "POST", body: JSON.stringify(body) }),
  });
}
