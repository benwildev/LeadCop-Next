import { useState, useEffect } from "react";
import axios from "axios";

export interface EmailIntelligenceResult {
  isValid: boolean;
  isDisposable: boolean;
  reputationScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  reasons: string[];
  didYouMean?: string | null;
  isValidSyntax: boolean;
}

export function useEmailIntelligence(email: string, delay: number = 600) {
  const [data, setData] = useState<EmailIntelligenceResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email || email.length < 5 || !email.includes("@")) {
      setData(null);
      return;
    }

    const handler = setTimeout(async () => {
      setIsChecking(true);
      setError(null);
      try {
        const response = await axios.post("/api/check-email", { email });
        setData(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to validate email");
      } finally {
        setIsChecking(false);
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [email, delay]);

  return { data, isChecking, error };
}
