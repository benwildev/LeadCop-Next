import React, { createContext, useContext, ReactNode } from "react";
import { useGetMe, useLogin, useRegister, useLogout, type UserProfile, type LoginRequest, type RegisterRequest } from "@/lib/api-client-react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      retry: false,
    } as any
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = async (data: LoginRequest) => {
    await loginMutation.mutateAsync({ data });
    // Force full reload to dashboard to ensure all states/cookies are fresh
    window.location.href = "/dashboard";
  };

  const register = async (data: RegisterRequest) => {
    await registerMutation.mutateAsync({ data });
    window.location.href = "/dashboard";
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error("Logout API call failed:", err);
    }
    
    // Always clear local state and redirect
    try {
      await refetch();
    } catch (err) {
      // Expected after logout
    }
    
    // Use window.location for a full refresh to clear all cache/state
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
