import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, XCircle, AlertTriangle, Shield, ShieldAlert,
  Zap, Mail, Database, Activity, RefreshCw, Loader2, Info
} from "lucide-react";

interface VerificationResult {
  isDisposable: boolean;
  domain: string;
  reputationScore: number;
  isValidSyntax: boolean;
  isRoleAccount: boolean;
  isFreeEmail: boolean;
  mxValid: boolean;
  inboxSupport: boolean;
  canConnectSmtp: boolean | null;
  mxAcceptsMail: boolean | null;
  mxRecords: string[];
  isDeliverable: boolean | null;
  isCatchAll: boolean | null;
  isDisabled: boolean | null;
  hasInboxFull: boolean | null;
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: VerificationResult | null;
  email: string;
}

export default function VerificationModal({ isOpen, onClose, result, email }: VerificationModalProps) {
  if (!isOpen) return null;

  const getStatusColor = (val: boolean | null | undefined) => {
    if (val === true) return "text-green-500 bg-green-500/10";
    if (val === false) return "text-red-400 bg-red-500/10";
    return "text-muted-foreground bg-muted/30";
  };

  const getStatusText = (val: boolean | null | undefined) => {
    if (val === true) return "true";
    if (val === false) return "false";
    return "null";
  };

  const scoreColor = result ? (result.reputationScore >= 80 ? "text-green-500" : result.reputationScore >= 50 ? "text-yellow-400" : "text-red-400") : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-2xl rounded-3xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">Verification Result</h2>
                  <p className="text-sm font-mono text-primary font-medium">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {result?.isDisposable && (
                  <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                    Disposable
                  </span>
                )}
                <div className="px-4 py-1.5 rounded-xl bg-secondary border border-border flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score:</span>
                  <span className={`text-base font-bold ${scoreColor}`}>{result?.reputationScore}/100</span>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Definition Box */}
              {result?.isDisposable && (
                <div className="mb-8 p-5 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-center">
                  <h3 className="text-orange-400 font-bold text-sm mb-1 uppercase tracking-wider flex items-center justify-center gap-2">
                    <Info className="h-4 w-4" /> What does "disposable" mean?
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    Temporary email address from a disposable email service provider. They may expire soon and the user may never check them again. Not recommended.
                  </p>
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
                <ResultRow label="status" value={result?.isDisposable ? "disposable" : "clean"} color={result?.isDisposable ? "text-red-400 bg-red-500/10" : "text-green-500 bg-green-500/10"} />
                <ResultRow label="can_connect_smtp" value={getStatusText(result?.canConnectSmtp)} color={getStatusColor(result?.canConnectSmtp)} />
                
                <ResultRow label="overall_score" value={`${result?.reputationScore}/100`} color={scoreColor + " bg-muted/10"} />
                <ResultRow label="mx_accepts_mail" value={getStatusText(result?.mxAcceptsMail)} color={getStatusColor(result?.mxAcceptsMail)} />
                
                <ResultRow label="is_safe_to_send" value={getStatusText(!result?.isDisposable && result?.isDeliverable)} color={getStatusColor(!result?.isDisposable && result?.isDeliverable)} />
                <ResultRow label="mx_records" value={result?.mxRecords[0] || "none"} isMono />
                
                <ResultRow label="is_valid_syntax" value={getStatusText(result?.isValidSyntax)} color={getStatusColor(result?.isValidSyntax)} />
                <ResultRow label="is_disabled" value={getStatusText(result?.isDisabled)} color={getStatusColor(result?.isDisabled)} />
                
                <ResultRow label="is_role_account" value={getStatusText(result?.isRoleAccount)} color={getStatusColor(result?.isRoleAccount)} />
                <ResultRow label="is_deliverable" value={getStatusText(result?.isDeliverable)} color={getStatusColor(result?.isDeliverable)} />
                
                <ResultRow label="is_catch_all" value={getStatusText(result?.isCatchAll)} color={getStatusColor(result?.isCatchAll)} />
                <div className="hidden md:block" /> {/* spacer */}
                
                <ResultRow label="is_disposable" value={getStatusText(result?.isDisposable)} color={getStatusColor(!result?.isDisposable)} />
                <div className="hidden md:block" /> {/* spacer */}
                
                <ResultRow label="is_free_email" value={getStatusText(result?.isFreeEmail)} color={getStatusColor(!result?.isFreeEmail)} />
                <div className="hidden md:block" /> {/* spacer */}
                
                <ResultRow label="has_inbox_full" value={getStatusText(result?.hasInboxFull)} color={getStatusColor(!result?.hasInboxFull)} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex justify-center bg-muted/5">
              <button
                onClick={onClose}
                className="px-12 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02]"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ResultRow({ label, value, color, isMono }: { label: string; value: string; color?: string; isMono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground font-medium text-xs tracking-tight">{label}</span>
      <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${color || "text-foreground bg-muted/30"} ${isMono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
