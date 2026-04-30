"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StripeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/dashboard"), 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 rounded-3xl text-center max-w-md w-full">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h2>
        <p className="text-muted-foreground mb-4">Your plan upgrade is being processed. It may take a few moments to reflect.</p>
        <p className="text-sm text-muted-foreground/60">Redirecting to dashboard...</p>
      </motion.div>
    </div>
  );
}
