"use client";

import React, { useState } from "react";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isValidEmail, extractDomain, KNOWN_DISPOSABLE_DOMAINS } from "@/utils/email-validation";
import { useQuery } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";

const DEFAULT_API_URL = "/api/check-email";

export default function EmailCheckForm({ apiUrl = DEFAULT_API_URL }: { apiUrl?: string }) {
  const [email, setEmail] = useState("");
  const debouncedEmail = useDebounce(email, 500);

  const { data, isFetching: checking } = useQuery({
    queryKey: ["check-email", debouncedEmail],
    queryFn: async () => {
      if (!isValidEmail(debouncedEmail)) return null;
      
      const domain = extractDomain(debouncedEmail);
      if (KNOWN_DISPOSABLE_DOMAINS.has(domain)) {
        return { isDisposable: true, domain, didYouMean: null, isGibberish: false };
      }

      try {
        const res = await axiosSecure.post(apiUrl, { email: debouncedEmail });
        const [local] = debouncedEmail.split("@");
        return {
          isDisposable: !!res.data.isDisposable,
          domain,
          didYouMean: res.data.didYouMean ? `${local}@${res.data.didYouMean}` : null,
          isGibberish: !!res.data.isGibberish
        };
      } catch {
        return { isDisposable: false, domain, didYouMean: null, isGibberish: false };
      }
    },
    enabled: isValidEmail(debouncedEmail),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const result = data;

  const showError = result?.isDisposable === true;
  const showSuggestion = !!result?.didYouMean;
  const showGibberish = !!result?.isGibberish && !showError && !showSuggestion;
  const showSuccess = result?.isDisposable === false && !showSuggestion && !showGibberish && isValidEmail(email);

  const applySuggestion = () => {
    if (!result?.didYouMean) return;
    setEmail(result.didYouMean);
  };

  return (
    <div className={`p-8 w-full max-w-sm rounded-[32px] border transition-all duration-300 ${
      showError ? "border-red-100 bg-red-50/30" : 
      (showSuggestion || showGibberish) ? "border-amber-100 bg-amber-50/30" :
      "border-primary/10 bg-white shadow-sm shadow-slate-100/50"
    }`}>
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all font-medium ${
                showError
                  ? "border-red-200 bg-white focus:ring-red-100"
                  : (showSuggestion || showGibberish)
                    ? "border-amber-200 bg-white focus:ring-amber-100"
                    : showSuccess
                      ? "border-emerald-200 bg-white focus:ring-emerald-100"
                      : "border-slate-100 bg-white focus:ring-primary/10"
              }`}
              placeholder="you@company.com"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {checking && (
                <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
              )}
              {!checking && showSuccess && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              )}
              {!checking && (showError || showSuggestion || showGibberish) && (
                <ShieldAlert className={`h-4 w-4 ${showError ? "text-red-500" : (showSuggestion || showGibberish) ? "text-amber-500" : "text-primary"}`} />
              )}
            </div>
          </div>
          <AnimatePresence>
             {/* 🧠 Logic: Suggestions and Gibberish warnings take priority */}
            {showSuggestion ? (
              <motion.div
                key="suggestion"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-center"
              >
                 <p className="text-[11px] text-amber-600 font-bold">
                    Did you mean <button onClick={applySuggestion} className="underline decoration-amber-300 underline-offset-2 hover:text-amber-700 transition-colors">{result?.didYouMean}</button>?
                 </p>
              </motion.div>
            ) : showGibberish ? (
              <motion.p
                key="gib"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-[11px] text-amber-600 font-bold text-center"
                role="alert"
              >
                Suspicious Pattern: Likely gibberish.
              </motion.p>
            ) : showError ? (
              <motion.p
                key="err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-[11px] text-red-500 font-bold text-center"
                role="alert"
              >
                Temporary email addresses are not allowed.
              </motion.p>
            ) : showSuccess ? (
              <motion.p
                key="ok"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-[11px] text-emerald-500 font-bold flex items-center justify-center gap-1.5"
                role="status"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Fast Detection: Valid entry
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>
        
        <button
          disabled={showError || !isValidEmail(email)}
          className="w-full rounded-xl bg-primary py-4 text-sm font-bold text-white transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed uppercase tracking-widest mt-2 shadow-lg shadow-primary/20"
        >
          Verify Now
        </button>
      </div>
      <p className="mt-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
        LeadCop Scanner
      </p>
    </div>
  );
}
