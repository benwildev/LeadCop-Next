"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MoveLeft, HelpCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50/50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-100/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg px-6 text-center"
      >
        <div className="mb-12 flex justify-center transform hover:scale-105 transition-transform duration-300">
          <Logo size={56} />
        </div>

        <div className="relative mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
            className="text-[150px] font-black text-primary/10 select-none leading-none"
          >
            404
          </motion.div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              className="bg-white p-4 rounded-2xl shadow-xl shadow-primary/10/50 border border-primary/5/50"
            >
              <ShieldAlert className="h-12 w-12 text-primary" />
            </motion.div>
          </div>
        </div>

        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-3xl font-bold text-gray-900 mb-4 tracking-tight"
        >
          Page Not Found
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg text-gray-600 mb-10 max-w-md mx-auto leading-relaxed"
        >
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 gap-2 group">
              <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
          
          <Link href="/support">
            <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all duration-300 gap-2">
              <HelpCircle className="w-4 h-4" />
              Contact Support
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-8 text-sm font-medium tracking-wide text-gray-400 select-none uppercase"
      >
        LeadCop Security &bull; Protection for Your Platform
      </motion.footer>
    </div>
  );
}
