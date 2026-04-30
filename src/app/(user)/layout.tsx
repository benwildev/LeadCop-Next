"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen isLoading={true} message="Authenticating..." />;
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
