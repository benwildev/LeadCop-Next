import { useState } from "react";
import {
  useAdminGetPlanConfig,
  useAdminUpdatePlanConfig,
  useAdminCreatePlanConfig,
  useAdminDeletePlanConfig,
} from "@/lib/api-client-react";
import type { PlanConfig } from "@/lib/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Zap, Lock, Plus, Check, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SectionHeader, GlassCard, ActionButton, ConfirmDialog } from "@/components/shared";

const BUILT_IN_PLANS = ["FREE", "PRO", "ENTERPRISE"];

const DEFAULT_NEW_PLAN = {
  requestLimit: 1000,
  dataLimit: 0,
  websiteLimit: 1,
  price: 19,
  maxApiKeys: 1,
  description: "",
  features: [] as string[],
  hasBulkValidation: false,
  bulkEmailLimit: 0,
  hasWebhooks: false,
  hasCustomBlocklist: false,
  hasAdvancedAnalytics: false,
  maxUsers: 1,
  logRetentionDays: 7,
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ plan: "", ...DEFAULT_NEW_PLAN });
  const [createError, setCreateError] = useState("");

  const PLAN_ORDER = ["FREE", "BASIC", "PRO", "MAX", "ENTERPRISE"];
  const configs = (configQuery.data?.configs || []).slice().sort((a, b) => {
    const idxA = PLAN_ORDER.indexOf(a.plan);
    const idxB = PLAN_ORDER.indexOf(b.plan);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

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
    field: keyof Partial<PlanConfig> | "featuresString",
    value: any,
  ) => {
    setEditValues((p) => ({ ...p, [plan]: { ...p[plan], [field]: value } }));
  };

  const handleSave = async (plan: string) => {
    const edits = editValues[plan] as any;
    if (!edits || Object.keys(edits).length === 0) return;
    
    // Convert featuresString back to array if present
    const updates: any = { ...edits };
    if (updates.featuresString !== undefined) {
      updates.features = updates.featuresString.split(",").map((s: string) => s.trim()).filter(Boolean);
      delete updates.featuresString;
    }

    // Cast numeric fields
    const numericFields = [
      "requestLimit", "dataLimit", "websiteLimit", "price", 
      "maxApiKeys", "maxUsers", "logRetentionDays", "bulkEmailLimit"
    ];
    numericFields.forEach(f => {
      if (updates[f] !== undefined && updates[f] !== "") {
        const val = Number(updates[f]);
        if (!isNaN(val)) {
          updates[f] = val;
        } else {
          delete updates[f];
        }
      } else if (updates[f] === "") {
        delete updates[f];
      }
    });

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
      toast.success(`${plan} plan updated successfully`);
      setTimeout(() => setSaved((p) => ({ ...p, [plan]: false })), 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to update plan");
    } finally {
      setSaving((p) => ({ ...p, [plan]: false }));
    }
  };

  const executeDelete = async (plan: string) => {
    setConfirmDelete(null);
    setSaving((p) => ({ ...p, [plan]: true }));
    try {
      await deleteMutation.mutateAsync(plan);
      toast.success(`Plan "${plan}" deleted`);
      qc.invalidateQueries({ queryKey: ["/api/admin/plan-config"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setSaving((p) => ({ ...p, [plan]: false }));
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
    BASIC: { label: "Basic", color: "text-blue-400", icon: Shield },
    PRO: { label: "Pro", color: "text-primary", icon: Lock },
    ENTERPRISE: { label: "Enterprise", color: "text-orange-400", icon: Zap },
  };

  const numFields = [
    { key: "price" as const, label: "Price (USD/mo)" },
    { key: "requestLimit" as const, label: "Request Limit" },
    { key: "dataLimit" as const, label: "Data Limit" },
    { key: "websiteLimit" as const, label: "Website Limit" },
    { key: "maxApiKeys" as const, label: "Max API Keys" },
    { key: "maxUsers" as const, label: "Max Seats" },
    { key: "logRetentionDays" as const, label: "Log Retention Days" },
    { key: "bulkEmailLimit" as const, label: "Bulk Email Limit" },
  ];

  const boolFields = [
    { key: "hasBulkValidation" as const, label: "Bulk Validation Enabled" },
    { key: "hasWebhooks" as const, label: "Webhooks Enabled" },
    { key: "hasCustomBlocklist" as const, label: "Custom Blocklist Enabled" },
    { key: "hasAdvancedAnalytics" as const, label: "Advanced Analytics Enabled" },
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
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={newPlan.description}
                  onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Plan tagline"
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">
                  Features (comma separated)
                </label>
                <textarea
                  value={newPlan.features.join(", ")}
                  onChange={(e) => setNewPlan((p) => ({ ...p, features: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }))}
                  placeholder="Feature 1, Feature 2..."
                  rows={2}
                  className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                />
              </div>
              {numFields.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground block mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    step={key === "price" ? 0.01 : 1}
                    value={(newPlan as any)[key]}
                    onChange={(e) =>
                      setNewPlan((p) => ({
                        ...p,
                        [key]: key === "price" ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>
              ))}
              
              <div className="sm:col-span-2 grid grid-cols-2 gap-4 mt-2">
                {boolFields.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(newPlan as any)[key]}
                      onChange={(e) =>
                        setNewPlan((p) => ({
                          ...p,
                          [key]: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>

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
                      onClick={() => setConfirmDelete(cfg.plan)}
                      disabled={saving[cfg.plan]}
                      title={`Delete ${cfg.plan} plan`}
                      className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      {saving[cfg.plan] ? (
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
                      Description
                    </label>
                    <input
                      type="text"
                      value={getValue(cfg.plan, "description", cfg.description ?? "") as string}
                      onChange={(e) => setValue(cfg.plan, "description", e.target.value)}
                      placeholder="Pricing plan tagline"
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Features (comma separated)
                    </label>
                    <textarea
                      value={(editValues[cfg.plan] as any)?.featuresString ?? (cfg.features || []).join(", ")}
                      onChange={(e) => setValue(cfg.plan, "featuresString", e.target.value)}
                      placeholder="1,000 credits, Multiple keys, ..."
                      rows={3}
                      className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                    />
                  </div>
                  {numFields.map(({ key, label }) => {
                    const supportsUnlimited = ["requestLimit", "dataLimit", "websiteLimit", "maxUsers", "logRetentionDays", "bulkEmailLimit"].includes(key);
                    let rawValue = (editValues[cfg.plan] as any)?.[key] ?? cfg[key] ?? "";
                    
                    // Display Unlimited if -1
                    let displayValue = rawValue;
                    if (supportsUnlimited && (rawValue === -1 || rawValue === "-1")) {
                      displayValue = "Unlimited";
                    }

                    return (
                      <div key={key}>
                        <label className="text-xs text-muted-foreground block mb-1">
                          {label}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={displayValue}
                            onChange={(e) => {
                              let val: any = e.target.value;
                              if (supportsUnlimited && (val.toLowerCase() === "unlimited" || val.toLowerCase() === "u")) {
                                val = -1;
                              }
                              setValue(cfg.plan, key, val);
                            }}
                            onFocus={(e) => {
                              if (displayValue === "Unlimited") {
                                setValue(cfg.plan, key, -1);
                              }
                            }}
                            className="w-full bg-muted/40 border border-border rounded-lg px-3 py-1.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            placeholder={supportsUnlimited ? "Enter -1 or 'unlimited' for no limit" : ""}
                          />
                          {supportsUnlimited && displayValue !== "Unlimited" && (
                            <button 
                              onClick={() => setValue(cfg.plan, key, -1)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded transition-colors"
                            >
                              Set Unlimited
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-2 border-t border-border mt-3 space-y-2">
                    {boolFields.map(({ key, label }) => {
                      const boolVal = getValue(cfg.plan, key as any, (cfg as any)[key]) as boolean;
                      return (
                        <label key={key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!boolVal}
                            onChange={(e) => setValue(cfg.plan, key as any, e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span className="text-xs text-foreground font-medium">{label}</span>
                        </label>
                      );
                    })}
                  </div>

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
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && executeDelete(confirmDelete)}
        title="Delete Subscription Plan"
        description={`Are you sure you want to delete the "${confirmDelete}" plan? This action is permanent and will affect users currently assigned to this tier.`}
        confirmText="Delete Plan"
        variant="danger"
      />
    </div>
  );
}
