import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, Mail } from "lucide-react";

export interface VerificationResult {
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
  tags?: string[];
  riskLevel?: string;
}

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: VerificationResult | null;
  email: string;
}

function StatusBadge({ value, label }: { value: boolean | null | undefined; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`px-2.5 py-0.5 rounded-lg font-bold text-xs ${
        value === true ? "text-green-500 bg-green-500/10" :
        value === false ? "text-red-400 bg-red-500/10" :
        "text-muted-foreground bg-muted/50"
      }`}>
        {value === true ? "true" : value === false ? "false" : "unknown"}
      </span>
    </div>
  );
}

export default function VerificationModal({ isOpen, onClose, result, email }: VerificationModalProps) {
  if (!isOpen) return null;

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
            className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-card border border-border shadow-2xl rounded-3xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-base font-bold text-foreground">Verification Result</h2>
                  <p className="text-xs font-mono text-primary font-medium">{email}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl border border-border hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Result Summary */}
              <div className="rounded-xl border border-border bg-muted/5 p-5">
                <div className="flex items-center gap-3">
                  {result?.isDisposable ? (
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                      <XCircle className="h-5 w-5 text-red-400" />
                    </div>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {result?.isDisposable ? "Disposable email" : result?.isDeliverable ? "Valid email" : "Invalid email"}
                      </h3>
                      {result?.isDisposable && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-widest border border-red-500/20">
                          Disposable
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result?.isDisposable
                        ? "This email is from a disposable provider and should not be trusted."
                        : result?.isDeliverable
                        ? "This email address exists and can receive emails."
                        : "This email address does not exist or cannot receive emails."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Format & Type */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Format & Type</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">Format</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        result?.isValidSyntax ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                      }`}>
                        {result?.isValidSyntax ? "Valid" : "Invalid"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result?.isValidSyntax
                        ? "Correct format, not gibberish."
                        : "This email has an invalid format."}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">Type</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        result?.isFreeEmail ? "bg-yellow-500/10 text-yellow-400" : "bg-green-500/10 text-green-500"
                      }`}>
                        {result?.isFreeEmail ? "Free" : "Professional"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result?.isFreeEmail
                        ? "Uses a free provider like Gmail or Yahoo."
                        : "Not a free or disposable email domain."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Server Status */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Server Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">MX Records</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        result?.mxValid ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-400"
                      }`}>
                        {result?.mxValid ? "Valid" : "Invalid"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {result?.mxValid && result.mxRecords.length > 0
                        ? result.mxRecords[0]
                        : "No MX records found"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">SMTP Connection</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        result?.canConnectSmtp === true ? "bg-green-500/10 text-green-500" :
                        result?.canConnectSmtp === false ? "bg-red-500/10 text-red-400" :
                        "bg-muted/50 text-muted-foreground"
                      }`}>
                        {result?.canConnectSmtp === true ? "Valid" : result?.canConnectSmtp === false ? "Invalid" : "Unknown"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result?.canConnectSmtp === true
                        ? "We can connect to the SMTP server."
                        : result?.canConnectSmtp === false
                        ? "Cannot connect to the SMTP server."
                        : "SMTP connection could not be determined."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Status */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Email Status</h4>
                <div className="rounded-lg bg-muted/30 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">Deliverable</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      result?.isDeliverable === true ? "bg-green-500/10 text-green-500" :
                      result?.isDeliverable === false ? "bg-red-500/10 text-red-400" :
                      "bg-muted/50 text-muted-foreground"
                    }`}>
                      {result?.isDeliverable === true ? "Valid" : result?.isDeliverable === false ? "Invalid" : "Unknown"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result?.isDeliverable === true
                      ? "This email address exists and can receive emails."
                      : result?.isDeliverable === false
                      ? "This email does not exist or cannot receive emails."
                      : "Deliverability could not be determined."}
                  </p>
                </div>
              </div>

              {/* Catch-All Warning */}
              {result?.isCatchAll === true && (
                <div className="rounded-lg border-2 border-red-500/30 bg-red-500/5 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-red-500">!</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-red-500 mb-1">This email has catch-all enabled</p>
                      <p className="text-xs text-red-400 leading-relaxed">
                        This domain accepts all emails, even non-existent addresses. This means any email format is valid for this domain. Verify the actual mailbox before using it for campaigns.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Catch-All Unknown Explanation */}
              {result?.isCatchAll === null && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-amber-500 mt-0.5">?</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-amber-600 mb-1">Catch-all Status Unknown</p>
                      <p className="text-xs text-amber-500">
                        We couldn't confirm if this domain has catch-all enabled. This could mean the mail server didn't respond to our test, or it uses advanced filtering. Assume it might accept any address format from this domain.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Checks */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detailed Checks</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <StatusBadge value={result?.isDisposable} label="is_disposable" />
                  <StatusBadge value={result?.isValidSyntax} label="is_valid_syntax" />
                  <StatusBadge value={result?.isRoleAccount} label="is_role_account" />
                  <StatusBadge value={result?.isFreeEmail} label="is_free_email" />
                  <StatusBadge value={result?.isCatchAll} label="is_catch_all" />
                  <StatusBadge value={result?.isDisabled} label="is_disabled" />
                  <StatusBadge value={result?.hasInboxFull} label="has_inbox_full" />
                  <StatusBadge value={result?.mxAcceptsMail} label="mx_accepts_mail" />
                </div>
              </div>

              {/* Tags */}
              {result?.tags && result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {result.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wide">
                      {tag.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex justify-center bg-muted/5 shrink-0">
              <button
                onClick={onClose}
                className="px-10 py-2.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-[1.02]"
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
