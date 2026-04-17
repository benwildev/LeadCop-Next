import { useState } from "react";
import {
  useAdminGetApiKeys,
  useAdminRevokeKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, Search, Key } from "lucide-react";
import { SectionHeader } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

export function ApiKeysSection() {
  const qc = useQueryClient();
  const keysQuery = useAdminGetApiKeys();
  const revokeKeyMutation = useAdminRevokeKey();
  const [loadingIds, setLoadingIds] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");

  const keys = (keysQuery.data?.keys || []).filter(
    (k) =>
      k.email.toLowerCase().includes(search.toLowerCase()) ||
      k.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleRevoke = async (userId: number, email: string) => {
    if (!confirm(`Revoke API key for "${email}"?`)) return;
    setLoadingIds((p) => ({ ...p, [userId]: true }));
    try {
      await revokeKeyMutation.mutateAsync(userId);
      qc.invalidateQueries({ queryKey: ["/api/admin/api-keys"] });
    } finally {
      setLoadingIds((p) => ({ ...p, [userId]: false }));
    }
  };

  return (
    <div>
      <SectionHeader
        title="API Keys"
        subtitle="View and revoke user API keys"
      />
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        {keysQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-border">
                <tr>
                  {["User", "Plan", "Masked Key", "Since", "Action"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      No keys found.
                    </td>
                  </tr>
                ) : (
                  keys.map((k) => (
                    <tr
                      key={k.userId}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {k.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {k.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-bold ${PLAN_COLORS[k.plan]}`}
                        >
                          {k.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {k.maskedKey}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(parseISO(k.createdAt), "PP")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRevoke(k.userId, k.email)}
                          disabled={loadingIds[k.userId]}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                        >
                          {loadingIds[k.userId] ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Key className="w-3.5 h-3.5" />
                          )}
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
