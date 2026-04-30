import React, { useState } from "react";
import { UserPlus, AlertTriangle, Loader2, Trash2, Mail, User as UserIcon, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";
import { toast } from "sonner";
import { GlassCard, ActionButton } from "@/components/shared";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

interface TeamData {
  members: TeamMember[];
  allowedSubUsers: number;
}

export default function TeamTab() {
  const qc = useQueryClient();
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  const { data, isLoading } = useQuery<TeamData>({
    queryKey: ["/api/user/team"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/user/team");
      return response.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await axiosSecure.post("/api/user/team/invite", payload);
      return response.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/team"] });
      toast.success("Team member added successfully");
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to invite team member");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosSecure.delete(`/api/user/team/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/user/team"] });
      toast.success("Member removed");
    },
    onError: () => {
      toast.error("Failed to remove member");
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMutation.mutate({ name: inviteName, email: inviteEmail, password: invitePassword });
  };

  const handleRemove = (id: number, name: string) => {
    if (confirm(`Remove ${name} from your team?`)) {
      removeMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const members = data?.members || [];
  const allowedSubUsers = data?.allowedSubUsers || 0;
  const isLimitReached = allowedSubUsers !== -1 && members.length >= allowedSubUsers;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">Team Management</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Invite members to share your current subscription plan and API limits.
        </p>
      </div>

      {isLimitReached ? (
        <GlassCard className="p-6 bg-amber-50/50 border-amber-200/50 flex items-start gap-4">
          <div className="p-2 bg-amber-100 rounded-lg shrink-0">
            <UserPlus className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-900">Seat Limit Reached</h3>
            <p className="text-xs text-amber-700 mt-1">
              Your current plan allows {allowedSubUsers + 1} total seats (1 admin + {allowedSubUsers} members). You have reached this limit.
            </p>
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="flex items-center gap-2 mb-6">
            <UserPlus className="h-4 w-4 text-primary" />
            <h3 className="font-heading text-base font-semibold">Invite New Member</h3>
          </div>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Full name"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="email"
                    placeholder="you@company.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    type="password"
                    placeholder="Create password"
                    className="w-full pl-9 pr-4 py-2.5 bg-muted/40 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    value={invitePassword}
                    onChange={e => setInvitePassword(e.target.value)}
                    minLength={8}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <ActionButton
                type="submit"
                loading={inviteMutation.isPending}
                variant="primary"
                icon={UserPlus}
              >
                Add Member
              </ActionButton>
            </div>
          </form>
        </GlassCard>
      )}

      <GlassCard padding="p-0" className="overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-heading text-sm font-semibold">Active Members</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Name</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Added On</th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    No team members added yet.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4 font-semibold text-foreground">{m.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{m.email}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemove(m.id, m.name)}
                        disabled={removeMutation.isPending && removeMutation.variables === m.id}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove member"
                      >
                        {removeMutation.isPending && removeMutation.variables === m.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
