import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AssistantPermissions } from "@/types";

export type UserRole = "super_admin" | "teacher" | "assistant";

interface AuthState {
  uid: string | null;
  email: string | null;
  name: string | null;
  role: UserRole | null;
  teacherId: string | null;
  photoUrl: string | null;
  permissions: AssistantPermissions | null;
  setAuth: (data: {
    uid: string;
    email: string;
    name?: string;
    role: UserRole;
    teacherId: string;
    photoUrl?: string | null;
    permissions?: AssistantPermissions | null;
  }) => void;
  updateProfile: (data: { name?: string; photoUrl?: string | null }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      uid: null,
      email: null,
      name: null,
      role: null,
      teacherId: null,
      photoUrl: null,
      permissions: null,
      setAuth: (data) =>
        set((state) => ({
          uid: data.uid,
          email: data.email,
          name: data.name !== undefined ? data.name || null : state.name,
          role: data.role,
          teacherId: data.teacherId,
          photoUrl: data.photoUrl !== undefined ? data.photoUrl || null : state.photoUrl,
          permissions: data.permissions || null,
        })),
      updateProfile: (data) =>
        set((state) => ({
          name: data.name !== undefined ? data.name || null : state.name,
          photoUrl: data.photoUrl !== undefined ? data.photoUrl || null : state.photoUrl,
        })),
      clearAuth: () =>
        set({
          uid: null,
          email: null,
          name: null,
          role: null,
          teacherId: null,
          photoUrl: null,
          permissions: null,
        }),
    }),
    {
      name: "fulk_auth_session",
    }
  )
);
