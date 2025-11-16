/* eslint-disable @typescript-eslint/no-explicit-any */
import { API } from "@/lib/axios-client";
import type { LoginType, RegisterType, UserType } from "@/types/auth.type";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { useSocket } from "./use-socket";

interface AuthState {
  user: UserType | null;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isAuthStatusLoading: boolean;

  register: (data: RegisterType) => Promise<void>;
  login: (data: LoginType) => Promise<void>;
  logout: () => Promise<void>;
  isAuthStatus: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isSigningUp: false,
      isLoggingIn: false,
      isAuthStatusLoading: false,

      register: async (data: RegisterType) => {
        set({ isSigningUp: true });
        try {
          const response = await API.post("/auth/register", data);
          set({ user: response.data.user });
          toast.success("Registration successful!");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Registration failed");
        } finally {
          set({ isSigningUp: false });
        }
      },

      login: async (data: LoginType) => {
        set({ isLoggingIn: true });
        try {
          const response = await API.post("/auth/login", data);
          set({ user: response.data.user });
          toast.success("Login successful!");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Login failed");
        } finally {
          set({ isLoggingIn: false });
        }
      },

      logout: async () => {
        try {
          await API.post("/auth/logout");
          set({ user: null });
          useSocket.getState().disconnectSocket();
          toast.success("Logged out successfully");
        } catch (err: any) {
          toast.error(err.response?.data?.message || "Logout failed");
        }
      },

      isAuthStatus: async () => {
        set({ isAuthStatusLoading: true });
        try {
          const response = await API.get("/auth/status");
          const user = response.data.user;
          set({ user });
          if (user?._id) {
            useSocket.getState().connectSocket();
          }
        } catch (err: any) {
          console.warn("Auth status check failed:", err.response?.data?.message);
          set({ user: null });
        } finally {
          set({ isAuthStatusLoading: false });
        }
      },
    }),
    {
      name: "whop:auth",
    }
  )
);
