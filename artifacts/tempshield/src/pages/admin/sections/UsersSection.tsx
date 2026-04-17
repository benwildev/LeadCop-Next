import { useState } from "react";
import {
  useAdminGetUsers,
  useAdminUpdateUserPlan,
  useAdminDeleteUser,
  useAdminResetUsage,
  useAdminRevokeKey,
  UpdatePlanRequestPlan,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Loader2, Search, Key, Trash2, RotateCcw } from "lucide-react";
import { SectionHeader } from "@/components/shared";
import { PLAN_COLORS } from "../constants";

export function UsersSection() {
  const qc = useQueryClient();
  const usersQuery = useAdminGetUsers();
  const updatePlanMutation = useAdminUpdateUserPlan();
  const deleteUserMutation = useAdminDeleteUser();
  const resetUsageMutation = useAdminResetUsage();
  const revokeKeyMutation = useAdminRevokeKey();
  const [search, setSearch] = useState("");
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  const users = (usersQuery.data?.users || []).filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase()),
  );

  const setLoading = (key: string, val: boolean) =>
    setLoadingIds((p) => ({ ...p, [key]: val }));

  const handlePlan = async (id: number, plan: string) => {
    const planValue =
      UpdatePlanRequestPlan[plan as keyof typeof UpdatePlanRequestPlan];
    if (!planValue) return;
    setLoading(`plan-${id}`, true);
    try {
      await updatePlanMutation.mutateAsync({
        userId: id,
        data: { plan: planValue },
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } finally {
      setLoading(`plan-${id}`, false);
    }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return;
    setLoading(`del-${id}`, true);
    try {
      await deleteUserMutation.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } finally {
      setLoading(`del-${id}`, false);
    }
  };

  const handleReset = async (id: number) => {
    setLoading(`reset-${id}`, true);
    try {
      await resetUsageMutation.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } finally {
      setLoading(`reset-${id}`, false);
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm("Revoke this API key? The user will need to get a new key."))
      return;
    setLoading(`revoke-${id}`, true);
    try {
      await revokeKeyMutation.mutateAsync(id);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } finally {
      setLoading(`revoke-${id}`, false);
    }
  };

  return (
    <div>
      <SectionHeader title="Users" subtitle="Manage all registered users" />
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>
      <div className="glass-card rounded-xl overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="border-b border-border">
                <tr>
                  {[
                    "Name / Email",
                    "Plan",
                    "Usage",
                    "Bulk Jobs",
                    "Joined",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {u.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {u.email}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.plan}
                          onChange={(e) => handlePlan(u.id, e.target.value)}
                          disabled={loadingIds[`plan-${u.id}`]}
                          className={`text-xs font-bold rounded-md px-2 py-1 border border-border bg-background cursor-pointer ${PLAN_COLORS[u.plan]}`}
                        >
                          <option value="FREE">FREE</option>
                          <option value="BASIC">BASIC</option>
                          <option value="PRO">PRO</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {u.requestCount} / {u.requestLimit}
                        <div className="mt-1 h-1 w-20 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-1 rounded-full bg-primary"
                            style={{
                              width: `${Math.min(100, (u.requestCount / u.requestLimit) * 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {u.bulkJobCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {format(parseISO(u.createdAt), "PP")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReset(u.id)}
                            disabled={loadingIds[`reset-${u.id}`]}
                            title="Reset usage"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            {loadingIds[`reset-${u.id}`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRevoke(u.id)}
                            disabled={loadingIds[`revoke-${u.id}`]}
                            title="Revoke API key"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                          >
                            {loadingIds[`revoke-${u.id}`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Key className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.email)}
                            disabled={loadingIds[`del-${u.id}`]}
                            title="Delete user"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            {loadingIds[`del-${u.id}`] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
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
