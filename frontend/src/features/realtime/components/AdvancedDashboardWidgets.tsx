import { type ReactNode } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldCheck, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

/* ─── StatisticCard ─────────────────────────────────────────── */
interface StatisticCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function StatisticCard({ title, value, subtitle, icon, trend }: StatisticCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="vault-card group p-5 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="label-caps">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
          {subtitle && <p className="text-[11px] text-[#475569] font-medium">{subtitle}</p>}
          {trend && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </span>
          )}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#818CF8]">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── RealtimeChartWidget ───────────────────────────────────── */
interface RealtimeChartWidgetProps {
  data: Array<{ date: string; size: number }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-[#161F2F] px-3 py-2 shadow-vault-xl">
      <p className="text-[10px] font-semibold text-[#64748B] mb-1">{label}</p>
      <p className="text-[13px] font-bold text-white">
        {(payload[0].value as number).toFixed(1)} MB
      </p>
    </div>
  );
};

export function RealtimeChartWidget({ data }: RealtimeChartWidgetProps) {
  return (
    <div className="vault-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps">Storage I/O Traffic</p>
          <p className="text-lg font-bold text-white mt-1">Live Feed</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#6366F1]/10 border border-[#6366F1]/20">
          <ArrowUpRight className="h-4 w-4 text-[#818CF8]" />
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="widgetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#475569', fontFamily: 'Inter' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="size"
              stroke="#6366F1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#widgetGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── WorkspaceHealthWidget ─────────────────────────────────── */
interface WorkspaceHealthWidgetProps {
  usedPercent: number;
  ocrSuccessPercent: number;
  queueHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

const HealthBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-semibold text-[#64748B]">{label}</span>
      <span className="text-[11px] font-bold text-white">{value.toFixed(1)}%</span>
    </div>
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

const QUEUE_CONFIG = {
  HEALTHY:  { color: '#10B981', label: 'Healthy',  dotClass: 'bg-emerald-500 animate-pulse' },
  WARNING:  { color: '#F59E0B', label: 'Warning',  dotClass: 'bg-amber-500 animate-bounce' },
  CRITICAL: { color: '#EF4444', label: 'Critical', dotClass: 'bg-red-500 animate-bounce' },
};

export function WorkspaceHealthWidget({ usedPercent, ocrSuccessPercent, queueHealth }: WorkspaceHealthWidgetProps) {
  const queueCfg = QUEUE_CONFIG[queueHealth];

  return (
    <div className="vault-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps">System Health</p>
          <p className="text-base font-bold text-white mt-1">Workspace Diagnostics</p>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold border`}
          style={{
            background: queueCfg.color + '15',
            borderColor: queueCfg.color + '30',
            color: queueCfg.color,
          }}>
          <span className={`h-1.5 w-1.5 rounded-full ${queueCfg.dotClass}`} />
          {queueCfg.label}
        </div>
      </div>

      <div className="space-y-3">
        <HealthBar
          label="Disk Quota Utilization"
          value={usedPercent}
          color={usedPercent > 85 ? '#EF4444' : usedPercent > 65 ? '#F59E0B' : '#6366F1'}
        />
        <HealthBar
          label="OCR Parsing Accuracy"
          value={ocrSuccessPercent}
          color="#10B981"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/[0.05]">
        <div className="rounded-[10px] bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569] mb-1">Queue Pipeline</p>
          <div className="flex items-center gap-1.5 font-bold text-[12px]" style={{ color: queueCfg.color }}>
            <span className={`h-1.5 w-1.5 rounded-full ${queueCfg.dotClass}`} />
            {queueHealth}
          </div>
        </div>
        <div className="rounded-[10px] bg-white/[0.03] border border-white/[0.05] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#475569] mb-1">Audit Registry</p>
          <div className="flex items-center gap-1.5 font-bold text-[12px] text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            VALIDATED
          </div>
        </div>
      </div>
    </div>
  );
}
