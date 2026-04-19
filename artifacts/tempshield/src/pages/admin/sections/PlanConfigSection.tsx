import { useState } from "react";
import {
  useAdminGetPlanConfig,
  useAdminUpdatePlanConfig,
  useAdminCreatePlanConfig,
  useAdminDeletePlanConfig,
} from "@workspace/api-client-react";
import type { PlanConfig } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Zap, Lock, Plus, Check, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";

const BUILT_IN_PLANS = ["FREE", "BASIC", "PRO"];

const DEFAULT_NEW_PLAN = {
  requestLimit: 100,
  mxDetectLimit: 0,
  inboxCheckLimit: 0,
  websiteLimit: 0,
  pageLimit: 0,
  maxBulkEmails: 0,
  mxDetectionEnabled: false,
  inboxCheckEnabled: false,
  price: 0,
};

export function PlanConfigSection() {
  const qc = useQueryClient();
  const configQuery = useAdminGetPlanConfig();
  const updateMutation = useAdminUpdatePlanConfig();
  const createMutation = useAdminCreatePlanConfig();
  const deleteMutation = useAdminDeletePlanConfig();

  const [editValues, setEditValues] = useState<
    Record<string, Partial<PlanConfig>>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ plan: "", ...DEFAULT_NEW_PLAN });
  const [createError, setCreateError] = useState("");

  const configs = configQuery.data?.configs || [];

  const getValue = <K extends keyof PlanConfig>(
    plan: string,
    field: K,
    original: PlanConfig[K],
  ): PlanConfig[K] => {
    const edits = editValues[plan];
    if (edits && field in edits) return edits[field] as PlanConfig[K];
    return original;
  };

  const setValue = (
    plan: string,
    field: keyof Partial<PlanConfig>,
    value: number | boolean,
  ) => {
    setEditValues((p) => ({ ...p, [plan]: { ...p[plan], [field]: value } }));
  };

  const handleSave = async (plan: string) => {
    const updates = editValues[plan];
    if (!updates || Object.keys(updates).length === 0) return;
    setSaving((p) => ({ ...p, [plan]: true }));
    try {
      await updateMutation.mutateAsync({ plan, data: updates });
      qc.invalidateQueries({ queryKey: ["/api/admin/plan-config"] });
      setEditValues((p) => {
        const n = { ...p };
        delete n[plan];
        return n;
      });
      setSaved((p) => ({ ...p, [plan]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [plan]: false })), 2000);
    } finally {
      setSaving((p) => ({ ...p, [plan]: false }));
    }
  };

  const handleDelete = async (plan: string) => {
    if (!confirm(`Delete plan "${plan}"? This cannot be undone.`)) return;
    setDeleting((p) => ({ ...p, [plan]: true }));
    try {
      await deleteMutation.mutateAsync(plan);
      qc.invalidateQueries({ queryKey: ["/api/admin/plan-config"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      alert(msg);
    } finally {
      setDeleting((p) => ({ ...p, [plan]: false }));
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    const planName = newPlan.plan.trim().toUpperCase();
    if (!planName || !/^[A-Z0-9_]+$/.test(planName)) {
      setCreateError(
        "Plan name must be uppercase letters, numbers, or underscores (e.g. ENTERPRISE)",
      );
      return;
    }
    try {
      await createMutation.mutateAsync({ ...newPlan, plan: planName });
      qc.invalidateQueries({ queryKey: ["/api/admin/plan-config"] });
      setNewPlan({ plan: "", ...DEFAULT_NEW_PLAN });
      setShowAddForm(false);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create plan",
      );
    }
  };

  const planMeta: Record<
    string,
    { label: string; color: string; icon: React.ElementType }
  > = {
    FREE: { label: "Free", color: "text-muted-foreground", icon: Shield },
    BASIC: { label: "Basic", color: "text-blue-400", icon: Zap },
    PRO: { label: "Pro", color: "text-primary", icon: Lock },
  };

  const numFields = [
    { key: "requestLimit" as const, label: "Request Limit" },
    { key: "mxDetectLimit" as const, label: "MX Detection Limit" },
    { key: "inboxCheckLimit" as const, label: "Inbox Check Limit" },
    { key: "websiteLimit" as const, label: "Website Limit" },
    { key: "pageLimit" as const, label: "Page Limit" },
    { key: "maxBulkEmails" as const, label: "Max Bulk Emails" },
  ];

  const boolFields = [
    { key: "mxDetectionEnabled" as const, label: "MX Detection" },
    { key: "inboxCheckEnabled" as const, label: "Inbox Check" },
  ];

  return (
    <div>
      <SectionHeader
        title="Plan Config"
        subtitle="Adjust limits and features per subscription tier"
        action={
          <ActionButton
            icon={Plus}
            variant="outline"
            onClick={() => { setShowAddForm((p) => !p); setCreateError(""); }}
          >
            Add Plan
          </ActionButton>
        }
      />

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <GlassCard rounded="rounded-xl" padding="p-5">
            <h3 className="font-heading text-base font-semibold text-foreground mb-4">
              New Subscription Plan
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">
                  Plan Name{" "}
                  <span className="text-muted-foreground/60">
                    (uppercase, e.g. ENTERPRISE)
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="ENTERPRISE"
                  value={newPlan.plan}
                  onChange={(e) =>
                    setNewPlan((p) => ({
                      ...p,
                      plan: e.target.value.toUpperCase(),
                    }))
                  }
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Price (USD/mo)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={newPlan.price}
                    onChange={(e) =>
                      setNewPlan((p) => ({
                        ...p,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              </div>
              {numFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    value={newPlan[key]}
                    onChange={(e) =>
                      setNewPlan((p) => ({
                        ...p,
                        [key]: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              ))}
              {boolFields.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPlan((p) => ({ ...p, [key]: !p[key] }))
                    }
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${newPlan[key] ? "bg-primary" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${newPlan[key] ? "translate-x-4" : ""}`}
                    />
                  </button>
                </div>
              ))}
            </div>
            {createError && (
              <p className="text-xs text-red-400 mt-3">{createError}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Create Plan
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setCreateError("");
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {configQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {configs.map((cfg) => {
            const meta = planMeta[cfg.plan] || {
              label: cfg.plan,
              color: "text-orange-400",
              icon: Zap,
            };
            const Icon = meta.icon;
            const hasChanges = !!(
              editValues[cfg.plan] &&
              Object.keys(editValues[cfg.plan]).length > 0
            );
            const isBuiltIn = BUILT_IN_PLANS.includes(cfg.plan);
            return (
              <motion.div
                key={cfg.plan}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
              <GlassCard rounded="rounded-xl" padding="p-5" className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                    <h3
                      className={`font-heading text-lg font-bold ${meta.color}`}
                    >
                      {meta.label}
                    </h3>
                  </div>
                  {!isBuiltIn && (
                    <button
                      onClick={() => handleDelete(cfg.plan)}
                      disabled={deleting[cfg.plan]}
                      title={`Delete ${cfg.plan} plan`}
                      className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      {deleting[cfg.plan] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Price (USD/mo)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-sm">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={getValue(cfg.plan, "price", cfg.price) as number}
                        onChange={(e) =>
                          setValue(
                            cfg.plan,
                            "price",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      />
                    </div>
                  </div>
                  {numFields.map(({ key, label }) => {
                    const numVal = getValue(cfg.plan, key, cfg[key]) as number;
                    return (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground block mb-1">
                          {label}
                        </label>
                        <input
                          type="number"
                          value={numVal}
                          onChange={(e) =>
                            setValue(
                              cfg.plan,
                              key,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </div>
                    );
                  })}
                  {boolFields.map(({ key, label }) => {
                    const boolVal = getValue(
                      cfg.plan,
                      key,
                      cfg[key],
                    ) as boolean;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-xs text-muted-foreground">
                          {label}
                        </span>
                        <button
                          onClick={() => setValue(cfg.plan, key, !boolVal)}
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${boolVal ? "bg-primary" : "bg-border"}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${boolVal ? "translate-x-4" : ""}`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleSave(cfg.plan)}
                  disabled={!hasChanges || saving[cfg.plan]}
                  className={`mt-auto py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    saved[cfg.plan]
                      ? "bg-green-500/15 text-green-400"
                      : hasChanges
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {saving[cfg.plan] ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : saved[cfg.plan] ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : null}
                  {saved[cfg.plan] ? "Saved!" : "Save Changes"}
                </button>
              </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
