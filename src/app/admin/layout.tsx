"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

import AdminLayoutWrapper from "@/components/admin/AdminLayoutWrapper";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "ADMIN") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen isLoading={true} message="Authenticating admin..." />;
  }

  if (!user || user.role !== "ADMIN") {
    return null; // Will redirect in useEffect
  }

  return <AdminLayoutWrapper>{children}</AdminLayoutWrapper>;
}
