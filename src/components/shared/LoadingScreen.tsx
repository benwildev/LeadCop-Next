import React from "react";
import { Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";

interface LoadingScreenProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingScreen({ isLoading, message = "LeadCop is initializing..." }: LoadingScreenProps) {
  return (
    <>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-slate-950 overflow-hidden"
        >
          {/* ... (rest of the component) ... */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#877FA7]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#877FA7]/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#877FA7]/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative flex flex-col items-center">
            {/* Logo Centerpiece */}
            <motion.div
              animate={{ 
                scale: [0.95, 1.05, 0.95],
                filter: ["drop-shadow(0 0 0px rgba(135,127,167,0))", "drop-shadow(0 0 30px rgba(135,127,167,0.3))", "drop-shadow(0 0 0px rgba(135,127,167,0))"]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: "easeInOut" 
              }}
              className="relative z-10"
            >
              <Logo size={80} />
            </motion.div>

            {/* Content box */}
            <div className="mt-16 text-center space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <p className="text-lg font-display font-bold text-slate-800 dark:text-white tracking-tight">
                  {message}
                </p>
                
                {/* Modern progress bar instead of dots */}
                <div className="mt-6 w-48 h-1 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden relative">
                  <motion.div 
                    animate={{ 
                      x: ["-100%", "100%"] 
                     }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 1.5, 
                      ease: "easeInOut" 
                    }}
                    className="absolute inset-0 bg-[#877FA7] rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Footer Branding */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-2"
          >
            <Shield className="w-4 h-4 text-[#877FA7]/40" />
            <span className="text-[10px] uppercase tracking-[0.4em] text-slate-400 font-bold">
              Secure Platform Shield
            </span>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}

export function LoadingWidget({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex flex-col items-center justify-center ${className}`}>
      <motion.div
        animate={{ 
          scale: [0.9, 1.1, 0.9],
          opacity: [0.5, 1, 0.5]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 2, 
          ease: "easeInOut" 
        }}
      >
        <Logo size={24} />
      </motion.div>
    </div>
  );
}
