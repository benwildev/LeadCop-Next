import { useState } from "react";
import {
  useAdminGetApiKeys,
  useAdminRevokeKey,
  type AdminApiKey,
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, Search, Key } from "lucide-react";
import { SectionHeader, GlassCard, ActionButton, DataTable, EmptyState, type Column } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

type ApiKeyRow = AdminApiKey & { id: number };

export function ApiKeysSection() {
  const qc = useQueryClient();
  const keysQuery = useAdminGetApiKeys();
  const revokeKeyMutation = useAdminRevokeKey();
  const [loadingIds, setLoadingIds] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");

  const keys: ApiKeyRow[] = (keysQuery.data?.keys || [])
    .filter(
      (k) =>
        k.email.toLowerCase().includes(search.toLowerCase()) ||
        k.name.toLowerCase().includes(search.toLowerCase()),
    )
    .map((k) => ({ ...k, id: k.userId }));

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

  const keyColumns: Column<ApiKeyRow>[] = [
    {
      key: "user",
      label: "User",
      render: (k) => (
        <>
          <div className="font-medium text-foreground">{k.name}</div>
          <div className="text-xs text-muted-foreground">{k.email}</div>
        </>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (k) => (
        <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${PLAN_COLORS[k.plan]}`}>
          {k.plan}
        </span>
      ),
    },
    {
      key: "maskedKey",
      label: "Masked Key",
      render: (k) => <span className="font-mono text-xs text-muted-foreground">{k.maskedKey}</span>,
    },
    {
      key: "createdAt",
      label: "Since",
      render: (k) => <span className="text-xs text-muted-foreground">{format(parseISO(k.createdAt), "PP")}</span>,
    },
    {
      key: "actions",
      label: "Action",
      render: (k) => (
        <ActionButton
          icon={Key}
          variant="outline"
          loading={loadingIds[k.userId]}
          onClick={() => handleRevoke(k.userId, k.email)}
          className="hover:text-yellow-400 hover:bg-yellow-500/10"
        >
          Revoke
        </ActionButton>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader title="API Keys" subtitle="View and revoke user API keys" />
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
      <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
        {keysQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : keys.length === 0 ? (
          <EmptyState icon={Key} title="No API keys found." />
        ) : (
          <DataTable<ApiKeyRow> columns={keyColumns} rows={keys} />
        )}
      </GlassCard>
    </div>
  );
}
