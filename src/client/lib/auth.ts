import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { UserProfile } from "@shared/types";

type AuthResponse = { user: UserProfile };

export function useAuthQuery() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<AuthResponse>("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      api<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; name: string; password: string }) =>
      api<AuthResponse>("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
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
