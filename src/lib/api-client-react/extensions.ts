import { useMutation, useQuery } from "@tanstack/react-query";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { DashboardData } from "./generated/api.schemas";

// ─── Plan Config ──────────────────────────────────────────────────────────────

export interface PlanConfig {
  id: number;
  plan: string;
  requestLimit: number;
  dataLimit: number;
  websiteLimit: number;
  price: number;
  rateLimitPerSecond: number;
  maxApiKeys: number;
  maxUsers: number;
  logRetentionDays: number;
  hasBulkValidation: boolean;
  bulkEmailLimit: number;
  hasWebhooks: boolean;
  hasCustomBlocklist: boolean;
  hasAdvancedAnalytics: boolean;
  description: string | null;
  features: string[];
}

export interface PlanConfigsResponse {
  configs: PlanConfig[];
}

export interface UpdatePlanConfigBody {
  requestLimit?: number;
  dataLimit?: number;
  websiteLimit?: number;
  price?: number;
  rateLimitPerSecond?: number;
  maxApiKeys?: number;
  maxUsers?: number;
  logRetentionDays?: number;
  hasBulkValidation?: boolean;
  bulkEmailLimit?: number;
  hasWebhooks?: boolean;
  hasCustomBlocklist?: boolean;
  hasAdvancedAnalytics?: boolean;
  description?: string;
  features?: string[];
}

export interface CreatePlanConfigBody {
  plan: string;
  requestLimit?: number;
  dataLimit?: number;
  websiteLimit?: number;
  price?: number;
  rateLimitPerSecond?: number;
  maxApiKeys?: number;
  maxUsers?: number;
  logRetentionDays?: number;
  hasBulkValidation?: boolean;
  bulkEmailLimit?: number;
  hasWebhooks?: boolean;
  hasCustomBlocklist?: boolean;
  hasAdvancedAnalytics?: boolean;
  description?: string;
  features?: string[];
}

// ─── Admin: Users ─────────────────────────────────────────────────────────────

export interface AdminUserFull {
  id: number;
  name: string;
  email: string;
  apiKey: string;
  role: "USER" | "ADMIN";
  plan: string;
  requestCount: number;
  requestLimit: number;
  createdAt: string;
  bulkJobCount?: number;
}

export interface AdminUsersFullResponse {
  users: AdminUserFull[];
  total: number;
}

export interface AdminUserDetails {
  websites: UserWebsite[];
  pages: UserPage[];
}

export interface AdminApiKey {
  userId: number;
  name: string;
  email: string;
  plan: string;
  maskedKey: string;
  createdAt: string;
}

export interface AdminApiKeysResponse {
  keys: AdminApiKey[];
  total: number;
}

// ─── User: Websites & Pages ───────────────────────────────────────────────────

export interface UserWebsite {
  id: number;
  userId: number;
  domain: string;
  createdAt: string;
}

export interface UserWebsitesResponse {
  websites: UserWebsite[];
  total: number;
}

export interface UserPage {
  id: number;
  userId: number;
  path: string;
  createdAt: string;
}

export interface UserPagesResponse {
  pages: UserPage[];
  total: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardPlanConfig {
  websiteLimit: number;
  dataLimit: number;
  maxApiKeys: number;
  maxUsers: number;
  logRetentionDays: number;
  rateLimitPerSecond: number;
  hasBulkValidation: boolean;
  bulkEmailLimit: number;
  hasWebhooks: boolean;
  hasCustomBlocklist: boolean;
  hasAdvancedAnalytics: boolean;
  requestLimit: number;
}

export interface DashboardCounts {
  namedApiKeys: number;
  webhooks: number;
  blocklist: number;
}

export interface DashboardDataWithPlanConfig extends DashboardData {
  planConfig: DashboardPlanConfig;
  counts?: DashboardCounts;
}

// ─── Named API Keys ───────────────────────────────────────────────────────────

export interface UserApiKey {
  id: number;
  name: string;
  key?: string;
  maskedKey: string;
  createdAt: string;
}

export interface UserApiKeysResponse {
  keys: UserApiKey[];
  total: number;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export interface UserWebhook {
  id: number;
  userId: number;
  url: string;
  secret: string | null;
  enabled: boolean;
  createdAt: string;
}

export interface UserWebhooksResponse {
  webhooks: UserWebhook[];
  total: number;
  canCreate: boolean;
  planRequired?: string;
}

export interface CreateWebhookBody {
  url: string;
  secret?: string;
  enabled?: boolean;
}

export interface UpdateWebhookBody {
  url?: string;
  secret?: string | null;
  enabled?: boolean;
}

// ─── Custom Blocklist ─────────────────────────────────────────────────────────

export interface BlocklistEntry {
  id: number;
  userId: number;
  domain: string;
  createdAt: string;
}

export interface BlocklistResponse {
  entries: BlocklistEntry[];
  total: number;
}

// ─── Check Email (Bulk) ───────────────────────────────────────────────────────

export interface BulkCheckResult {
  email: string;
  isDisposable?: boolean;
  domain?: string;
  reputationScore?: number;
  mxValid?: boolean;
  error?: string;
}

export interface BulkCheckResponse {
  results: BulkCheckResult[];
  totalChecked: number;
  disposableCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook Exports
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Admin: Plan Config ───────────────────────────────────────────────────────

export function useAdminGetPlanConfig(options?: { query?: UseQueryOptions<PlanConfigsResponse> }) {
  return useQuery({
    queryKey: ["/api/admin/plan-config"],
    queryFn: () => customFetch<PlanConfigsResponse>("/api/admin/plan-config"),
    ...options?.query,
  });
}

export function useAdminUpdatePlanConfig(
  options?: UseMutationOptions<{ message: string; config: PlanConfig }, Error, { plan: string; data: UpdatePlanConfigBody }>
) {
  return useMutation({
    mutationFn: ({ plan, data }) =>
      customFetch<{ message: string; config: PlanConfig }>(`/api/admin/plan-config/${plan}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useAdminCreatePlanConfig(
  options?: UseMutationOptions<{ message: string; config: PlanConfig }, Error, CreatePlanConfigBody>
) {
  return useMutation({
    mutationFn: (data) =>
      customFetch<{ message: string; config: PlanConfig }>("/api/admin/plan-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useAdminDeletePlanConfig(options?: UseMutationOptions<{ message: string }, Error, string>) {
  return useMutation({
    mutationFn: (plan: string) =>
      customFetch<{ message: string }>(`/api/admin/plan-config/${plan}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── Admin: API Keys ──────────────────────────────────────────────────────────

export function useAdminGetApiKeys(options?: { query?: UseQueryOptions<AdminApiKeysResponse> }) {
  return useQuery({
    queryKey: ["/api/admin/api-keys"],
    queryFn: () => customFetch<AdminApiKeysResponse>("/api/admin/api-keys"),
    ...options?.query,
  });
}

export function useAdminGetUserDetails(
  userId: number,
  options?: { query?: Omit<UseQueryOptions<AdminUserDetails>, "queryKey" | "queryFn"> }
) {
  return useQuery({
    queryKey: [`/api/admin/users/${userId}/details`],
    queryFn: () => customFetch<AdminUserDetails>(`/api/admin/users/${userId}/details`),
    enabled: userId > 0,
    ...options?.query,
  });
}

export function useAdminDeleteUser(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch<{ message: string }>(`/api/admin/users/${userId}`, { method: "DELETE" }),
    ...options,
  });
}

export function useAdminResetUsage(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch<{ message: string }>(`/api/admin/users/${userId}/reset-usage`, { method: "POST" }),
    ...options,
  });
}

export function useAdminRevokeKey(
  options?: UseMutationOptions<{ message: string; apiKey: string }, Error, number>
) {
  return useMutation({
    mutationFn: (userId: number) =>
      customFetch<{ message: string; apiKey: string }>(`/api/admin/users/${userId}/revoke-key`, {
        method: "POST",
      }),
    ...options,
  });
}

// ─── User: Websites ───────────────────────────────────────────────────────────

export function useGetUserWebsites(options?: { query?: UseQueryOptions<UserWebsitesResponse> }) {
  return useQuery({
    queryKey: ["/api/user/websites"],
    queryFn: () => customFetch<UserWebsitesResponse>("/api/user/websites"),
    ...options?.query,
  });
}

export function useAddUserWebsite(
  options?: UseMutationOptions<{ website: UserWebsite; message: string }, Error, string>
) {
  return useMutation({
    mutationFn: (domain: string) =>
      customFetch<{ website: UserWebsite; message: string }>("/api/user/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }),
    ...options,
  });
}

export function useDeleteUserWebsite(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/user/websites/${id}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── User: Pages ──────────────────────────────────────────────────────────────

export function useGetUserPages(options?: { query?: UseQueryOptions<UserPagesResponse> }) {
  return useQuery({
    queryKey: ["/api/user/pages"],
    queryFn: () => customFetch<UserPagesResponse>("/api/user/pages"),
    ...options?.query,
  });
}

export function useAddUserPage(
  options?: UseMutationOptions<{ page: UserPage; message: string }, Error, string>
) {
  return useMutation({
    mutationFn: (path: string) =>
      customFetch<{ page: UserPage; message: string }>("/api/user/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      }),
    ...options,
  });
}

export function useDeleteUserPage(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/user/pages/${id}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── User: Named API Keys ─────────────────────────────────────────────────────

export function useGetUserApiKeys(options?: { query?: UseQueryOptions<UserApiKeysResponse> }) {
  return useQuery({
    queryKey: ["/api/user/api-keys"],
    queryFn: () => customFetch<UserApiKeysResponse>("/api/user/api-keys"),
    ...options?.query,
  });
}

export function useCreateUserApiKey(
  options?: UseMutationOptions<{ key: UserApiKey; message: string }, Error, string>
) {
  return useMutation({
    mutationFn: (name: string) =>
      customFetch<{ key: UserApiKey; message: string }>("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    ...options,
  });
}

export function useDeleteUserApiKey(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/user/api-keys/${id}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── User: Webhooks ───────────────────────────────────────────────────────────

export function useGetUserWebhooks(options?: { query?: UseQueryOptions<UserWebhooksResponse> }) {
  return useQuery({
    queryKey: ["/api/user/webhooks"],
    queryFn: () => customFetch<UserWebhooksResponse>("/api/user/webhooks"),
    ...options?.query,
  });
}

export function useCreateUserWebhook(
  options?: UseMutationOptions<{ webhook: UserWebhook; message: string }, Error, CreateWebhookBody>
) {
  return useMutation({
    mutationFn: (data) =>
      customFetch<{ webhook: UserWebhook; message: string }>("/api/user/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useUpdateUserWebhook(
  options?: UseMutationOptions<
    { webhook: UserWebhook; message: string },
    Error,
    { id: number; data: UpdateWebhookBody }
  >
) {
  return useMutation({
    mutationFn: ({ id, data }) =>
      customFetch<{ webhook: UserWebhook; message: string }>(`/api/user/webhooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    ...options,
  });
}

export function useDeleteUserWebhook(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/user/webhooks/${id}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── User: Custom Blocklist ───────────────────────────────────────────────────

export function useGetBlocklist(options?: { query?: UseQueryOptions<BlocklistResponse> }) {
  return useQuery({
    queryKey: ["/api/user/blocklist"],
    queryFn: () => customFetch<BlocklistResponse>("/api/user/blocklist"),
    ...options?.query,
  });
}

export function useAddBlocklistEntry(
  options?: UseMutationOptions<{ entry: BlocklistEntry; message: string }, Error, string>
) {
  return useMutation({
    mutationFn: (domain: string) =>
      customFetch<{ entry: BlocklistEntry; message: string }>("/api/user/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }),
    ...options,
  });
}

export function useDeleteBlocklistEntry(options?: UseMutationOptions<{ message: string }, Error, number>) {
  return useMutation({
    mutationFn: (id: number) =>
      customFetch<{ message: string }>(`/api/user/blocklist/${id}`, { method: "DELETE" }),
    ...options,
  });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsDailyCall {
  date: string;
  count: number;
}

export interface AnalyticsTopDomain {
  domain: string;
  count: number;
}

export interface UserAnalyticsResponse {
  dailyCalls: AnalyticsDailyCall[];
  monthTotal: number;
  limited: boolean;
  disposableRate?: number;
  disposableCount?: number;
  totalChecked?: number;
  topBlockedDomains?: AnalyticsTopDomain[];
}

export function useGetUserAnalytics(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["/api/user/analytics"],
    queryFn: () => customFetch<UserAnalyticsResponse>("/api/user/analytics"),
    enabled: options?.enabled,
  });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: number;
  endpoint: string;
  email?: string | null;
  domain?: string | null;
  isDisposable?: boolean | null;
  reputationScore?: number | null;
  timestamp: string;
}

export interface AuditLogResponse {
  entries: AuditLogEntry[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function useGetUserAuditLog(
  params?: { page?: number; limit?: number },
  options?: { query?: UseQueryOptions<AuditLogResponse> }
) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  return useQuery({
    queryKey: ["/api/user/audit-log", page, limit],
    queryFn: () =>
      customFetch<AuditLogResponse>(`/api/user/audit-log?page=${page}&limit=${limit}`),
    ...options?.query,
  });
}

// ─── Bulk Check Email ─────────────────────────────────────────────────────────

export function useBulkCheckEmails(
  options?: UseMutationOptions<BulkCheckResponse, Error, string[]>
) {
  return useMutation({
    mutationFn: (emails: string[]) =>
      customFetch<BulkCheckResponse>("/api/check-emails/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      }),
    ...options,
  });
}

// ─── Admin: Add Domain ────────────────────────────────────────────────────────

export interface AddDomainResponse {
  domain: string;
  totalDomains: number;
}

export function useAdminAddDomain(
  options?: UseMutationOptions<AddDomainResponse, Error, string>
) {
  return useMutation({
    mutationFn: (domain: string) =>
      customFetch<AddDomainResponse>("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }),
    ...options,
  });
}
// ─── Whitelist ──────────────────────────────────────────────────────────────

export interface WhitelistEntry {
  id: number;
  domain: string;
  createdAt: string;
}

export interface WhitelistResponse {
  whitelist: WhitelistEntry[];
}

export function useAdminGetWhitelist(options?: { query?: UseQueryOptions<WhitelistResponse> }) {
  return useQuery({
    queryKey: ["/api/admin/whitelist"],
    queryFn: () => customFetch<WhitelistResponse>("/api/admin/whitelist"),
    ...options?.query,
  });
}

export function useAdminAddWhitelist(
  options?: UseMutationOptions<{ domain: string }, Error, string>
) {
  return useMutation({
    mutationFn: (domain: string) =>
      customFetch<{ domain: string }>("/api/admin/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }),
    ...options,
  });
}

export function useAdminDeleteWhitelist(options?: UseMutationOptions<{ ok: boolean }, Error, string>) {
  return useMutation({
    mutationFn: (domain: string) =>
      customFetch<{ ok: boolean }>(`/api/admin/whitelist/${domain}`, { method: "DELETE" }),
    ...options,
  });
}

/**
 * Enhanced domain deletion with optional whitelisting
 */
export function useAdminDeleteDomain(options?: UseMutationOptions<{ ok: boolean }, Error, { domain: string; whitelist?: boolean }>) {
  return useMutation({
    mutationFn: ({ domain, whitelist }) =>
      customFetch<{ ok: boolean }>(`/api/admin/domains/${domain}${whitelist ? "?whitelist=true" : ""}`, { method: "DELETE" }),
    ...options,
  });
}
