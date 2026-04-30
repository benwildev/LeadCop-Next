import React from "react";
import { format, parseISO } from "date-fns";
import { 
  Loader2, 
  Server, 
  Cpu, 
  Database, 
  Zap, 
  Activity, 
  Clock, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { SectionHeader, GlassCard, ActionButton } from "@/components/shared";
import { useQuery } from "@tanstack/react-query";
import { axiosSecure } from "@/lib/api-client-react";

interface SystemStatus {
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  postgres: {
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    latencyMs: number;
    info?: {
      memory: string;
      clients: string;
    }
  };
}

export function SystemStatusSection() {
  const { data: status, isLoading, isFetching, refetch, error } = useQuery<SystemStatus>({
    queryKey: ["/api/admin/system/status"],
    queryFn: async () => {
      const response = await axiosSecure.get("/api/admin/system/status");
      return response.data;
    },
    refetchInterval: 30000, // Auto refresh every 30s
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <SectionHeader
          title="System Status"
          subtitle="Real-time performance metrics and infrastructure health"
        />
        <ActionButton 
          variant="outline" 
          onClick={() => refetch()} 
          loading={isFetching && !isLoading}
          icon={RefreshCw}
        >
          Refresh
        </ActionButton>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Diagnostics in progress...</p>
        </div>
      ) : error ? (
        <GlassCard className="bg-red-50/50 border-red-100 p-12 text-center">
           <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
           <h3 className="text-lg font-bold text-red-800 mb-2">Service Unreachable</h3>
           <p className="text-red-600/80 max-w-sm mx-auto text-sm">
             The admin status API is currently not responding. This might be due to a temporary network issue or server-side error.
           </p>
           <button onClick={() => refetch()} className="mt-6 text-sm font-bold text-red-700 underline underline-offset-4 hover:text-red-900">
             Retry Connection
           </button>
        </GlassCard>
      ) : status && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node.js Runtime */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Node.js Engine</h3>
                  <p className="text-xs font-medium text-emerald-600">Operational</p>
                </div>
                <div className="ml-auto text-right">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Uptime</p>
                   <p className="text-sm font-bold text-slate-700">{formatUptime(status.uptime)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <MetricRow icon={Clock} label="Last Response" value={format(parseISO(status.timestamp), "HH:mm:ss")} />
                <MetricRow icon={Cpu} label="Heap Used" value={formatBytes(status.memory.heapUsed)} />
                <MetricRow icon={Activity} label="External" value={formatBytes(status.memory.external)} />
                <div className="pt-4 mt-2 border-t border-slate-50 text-[11px] text-slate-400 italic">
                  RSS Memory allocation is currently at <span className="font-bold text-slate-700">{formatBytes(status.memory.rss)}</span>.
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Database Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status.postgres.status === 'healthy' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">PostgreSQL Cloud</h3>
                  <p className={`text-xs font-medium ${status.postgres.status === 'healthy' ? 'text-blue-600' : 'text-red-600'}`}>
                    {status.postgres.status === 'healthy' ? 'Connected' : 'Connection Refused'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <MetricRow 
                  icon={Activity} 
                  label="Query Latency" 
                  value={
                    <span className="flex items-center gap-2">
                       {status.postgres.latencyMs} ms
                       <span className={`w-2 h-2 rounded-full ${status.postgres.latencyMs < 50 ? 'bg-emerald-500' : status.postgres.latencyMs < 150 ? 'bg-amber-500' : 'bg-red-500'}`} />
                    </span>
                  } 
                />
              </div>
            </GlassCard>
          </motion.div>

          {/* Redis Details */}
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
            <GlassCard className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-1 border-r border-slate-100 pr-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status.redis.status === 'healthy' ? 'bg-rose-50 text-rose-600' : 'bg-red-50 text-red-600'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">Redis Cache</h3>
                    <p className={`text-xs font-medium ${status.redis.status === 'healthy' ? 'text-rose-600' : 'text-red-600'}`}>
                      {status.redis.status === 'healthy' ? 'Queue Active' : 'Offline'}
                    </p>
                  </div>
                </div>
                <MetricRow 
                  icon={Activity} 
                  label="Ping Latency" 
                  value={
                    <span className="flex items-center gap-2">
                       {status.redis.latencyMs} ms
                       <span className={`w-2 h-2 rounded-full ${status.redis.latencyMs < 20 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </span>
                  } 
                />
              </div>
              
              <div className="md:col-span-2 flex flex-col justify-center">
                {status.redis.info ? (
                   <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                       <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Queue Memory</p>
                       <p className="text-xl font-semibold text-slate-800">{status.redis.info.memory}</p>
                     </div>
                     <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                       <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Active Connections</p>
                       <p className="text-xl font-semibold text-slate-800">{status.redis.info.clients}</p>
                     </div>
                   </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Redis INFO block is unavailable on the current connection context.</p>
                )}
              </div>
            </GlassCard>
           </motion.div>
        </div>
      )}
    </div>
  );
}

function MetricRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <div className="text-sm font-bold text-slate-800 text-right">
        {value}
      </div>
    </div>
  );
}
