import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, FileText, Calendar, Loader2 } from "lucide-react";
import { useAdminGetUserDetails } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";

interface UserDetailsModalProps {
  userId: number;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserDetailsModal({ userId, userName, isOpen, onClose }: UserDetailsModalProps) {
  const { data, isLoading } = useAdminGetUserDetails(userId, {
    query: { enabled: isOpen && userId > 0 },
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-card border border-border shadow-2xl rounded-3xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">User Configuration</h2>
                  <p className="text-xs text-muted-foreground">{userName}</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-medium">Loading details...</p>
                </div>
              ) : (
                <>
                  {/* Websites Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <Globe className="h-4 w-4 text-primary" />
                      <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">Authorized Websites</h3>
                    </div>
                    {data?.websites.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/5">
                        <p className="text-xs text-muted-foreground">No websites configured.</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {data?.websites.map((w) => (
                          <div key={w.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <span className="text-sm font-mono font-medium text-foreground">{w.domain}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(w.createdAt), "PP")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Pages Section */}
                  <section>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wider">Protected Pages</h3>
                    </div>
                    {data?.pages.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/5">
                        <p className="text-xs text-muted-foreground">No protected pages configured.</p>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {data?.pages.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                            <span className="text-sm font-mono font-medium text-foreground">{p.path}</span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(p.createdAt), "PP")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex justify-center bg-muted/5 shrink-0">
              <button
                onClick={onClose}
                className="px-10 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
