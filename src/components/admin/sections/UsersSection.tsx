import { useState } from "react";
import {
  useAdminGetUsers,
  useAdminUpdateUserPlan,
  useAdminDeleteUser,
  useAdminResetUsage,
  useAdminRevokeKey,
  UpdatePlanRequestPlan,
  type AdminUser,
} from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Loader2, Search, Key, Trash2, RotateCcw, Users, Eye, Target } from "lucide-react";
import { SectionHeader, GlassCard, ActionButton, DataTable, EmptyState, ConfirmDialog, type Column } from "@/components/shared";
import { UserDetailsModal } from "../components/UserDetailsModal";
import { PLAN_COLORS } from "../constants";

type ConfirmState = {
  type: 'delete' | 'revoke';
  id: number;
  email?: string;
} | null;

export function UsersSection() {
  const qc = useQueryClient();
  const usersQuery = useAdminGetUsers();
  const updatePlanMutation = useAdminUpdateUserPlan();
  const deleteUserMutation = useAdminDeleteUser();
  const resetUsageMutation = useAdminResetUsage();
  const revokeKeyMutation = useAdminRevokeKey();
  const [search, setSearch] = useState("");
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [viewUser, setViewUser] = useState<{ id: number; name: string } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const users = (usersQuery.data?.users || []).filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase()),
  );

  const setLoading = (key: string, val: boolean) =>
    setLoadingIds((p) => ({ ...p, [key]: val }));

  const handlePlan = async (id: number, plan: string) => {
    const planValue = UpdatePlanRequestPlan[plan as keyof typeof UpdatePlanRequestPlan];
    if (!planValue) return;
    setLoading(`plan-${id}`, true);
    try {
      await updatePlanMutation.mutateAsync({ userId: id, data: { plan: planValue } });
      toast.success(`Plan updated to ${planValue}`);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to update plan");
    } finally {
      setLoading(`plan-${id}`, false);
    }
  };

  const executeDelete = async (id: number) => {
    setLoading(`del-${id}`, true);
    try {
      await deleteUserMutation.mutateAsync(id);
      toast.success("User deleted successfully");
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    } finally {
      setLoading(`del-${id}`, false);
    }
  };

  const handleReset = async (id: number) => {
    setLoading(`reset-${id}`, true);
    try {
      await resetUsageMutation.mutateAsync(id);
      toast.success("Usage reset successfully");
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to reset usage");
    } finally {
      setLoading(`reset-${id}`, false);
    }
  };

  const executeRevoke = async (id: number) => {
    setLoading(`revoke-${id}`, true);
    try {
      await revokeKeyMutation.mutateAsync(id);
      toast.success("API key revoked");
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to revoke key");
    } finally {
      setLoading(`revoke-${id}`, false);
    }
  };

  const handleSetLimit = async (id: number, current: number) => {
    const val = window.prompt("Enter new custom credit/request limit:", String(current));
    if (val === null) return;
    const limit = parseInt(val);
    if (isNaN(limit) || limit < 0) {
      toast.error("Please enter a valid number");
      return;
    }
    setLoading(`limit-${id}`, true);
    try {
      await updatePlanMutation.mutateAsync({ userId: id, data: { requestLimit: limit } });
      toast.success(`Credit limit set to ${limit}`);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to set limit");
    } finally {
      setLoading(`limit-${id}`, false);
    }
  };

  const userColumns: Column<AdminUser>[] = [
    {
      key: "name",
      label: "Name / Email",
      render: (u) => (
        <>
          <div className="font-medium text-foreground">{u.name}</div>
          <div className="text-xs text-muted-foreground">{u.email}</div>
        </>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (u) => (
        <select
          value={u.plan}
          onChange={(e) => handlePlan(u.id, e.target.value)}
          disabled={loadingIds[`plan-${u.id}`]}
          className={`text-xs font-bold rounded-md px-2 py-1 border border-border bg-background cursor-pointer ${PLAN_COLORS[u.plan]}`}
        >
          <option value="FREE">FREE</option>
          <option value="BASIC">BASIC</option>
          <option value="PRO">PRO</option>
          <option value="ENTERPRISE">ENTERPRISE</option>
        </select>
      ),
    },
    {
      key: "usage",
      label: "Usage",
      render: (u) => (
        <span className="text-muted-foreground text-xs">
          {u.requestCount} / {u.requestLimit}
          <div className="mt-1 h-1 w-20 rounded-full bg-border overflow-hidden">
            <div
              className="h-1 rounded-full bg-primary"
              style={{ width: `${Math.min(100, (u.requestCount / u.requestLimit) * 100)}%` }}
            />
          </div>
        </span>
      ),
    },
    {
      key: "bulkJobCount",
      label: "Bulk Jobs",
      render: (u) => <span className="text-xs text-muted-foreground">{u.bulkJobCount ?? 0}</span>,
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (u) => <span className="text-xs text-muted-foreground">{format(parseISO(u.createdAt), "PP")}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (u) => (
        <div className="flex items-center gap-1">
          <ActionButton
            icon={Eye}
            variant="outline"
            onClick={() => setViewUser({ id: u.id, name: u.name })}
            title="View details"
            className="hover:text-primary hover:bg-primary/10"
          />
          <ActionButton
            icon={RotateCcw}
            variant="outline"
            loading={loadingIds[`reset-${u.id}`]}
            onClick={() => handleReset(u.id)}
            title="Reset usage"
          />
          <ActionButton
            icon={Target}
            variant="outline"
            loading={loadingIds[`limit-${u.id}`]}
            onClick={() => handleSetLimit(u.id, u.requestLimit)}
            title="Set custom credits"
            className="hover:text-blue-400 hover:bg-blue-500/10"
          />
          <ActionButton
            icon={Key}
            variant="outline"
            loading={loadingIds[`revoke-${u.id}`]}
            onClick={() => setConfirmState({ type: 'revoke', id: u.id })}
            title="Revoke API key"
            className="hover:text-yellow-400 hover:bg-yellow-500/10"
          />
          <ActionButton
            icon={Trash2}
            variant="danger"
            loading={loadingIds[`del-${u.id}`]}
            onClick={() => setConfirmState({ type: 'delete', id: u.id, email: u.email })}
            title="Delete user"
          />
        </div>
      ),
    },
  ];

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
      <GlassCard rounded="rounded-xl" padding="p-0" className="overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users found." />
        ) : (
          <DataTable<AdminUser>
            columns={userColumns}
            rows={users}
          />
        )}
      </GlassCard>

      <UserDetailsModal
        isOpen={!!viewUser}
        userId={viewUser?.id || 0}
        userName={viewUser?.name || ""}
        onClose={() => setViewUser(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          if (confirmState.type === 'delete') executeDelete(confirmState.id);
          else executeRevoke(confirmState.id);
        }}
        title={confirmState?.type === 'delete' ? "Delete User" : "Revoke API Key"}
        description={
          confirmState?.type === 'delete' 
            ? `Are you sure you want to delete ${confirmState.email}? This action is permanent and cannot be undone.`
            : "Are you sure you want to revoke this API key? The user will lose access until they generate a new one."
        }
        confirmText={confirmState?.type === 'delete' ? "Delete User" : "Revoke Key"}
        variant={confirmState?.type === 'delete' ? "danger" : "primary"}
      />
    </div>
  );
}
