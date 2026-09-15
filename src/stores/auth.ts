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
  permissions: AssistantPermissions | null;
  setAuth: (data: {
    uid: string;
    email: string;
    name?: string;
    role: UserRole;
    teacherId: string;
    permissions?: AssistantPermissions | null;
  }) => void;
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
      permissions: null,
      setAuth: (data) =>
        set({
          uid: data.uid,
          email: data.email,
          name: data.name || null,
          role: data.role,
          teacherId: data.teacherId,
          permissions: data.permissions || null,
        }),
      clearAuth: () =>
        set({
          uid: null,
          email: null,
          name: null,
          role: null,
          teacherId: null,
          permissions: null,
        }),
    }),
    {
      name: "fulk_auth_session",
    }
  )
);
