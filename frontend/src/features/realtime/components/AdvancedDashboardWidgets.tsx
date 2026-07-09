import { type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ShieldCheck } from 'lucide-react';

// 1. Statistic Card
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
    <Card className="border">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{title}</p>
          <h3 className="text-xl font-bold text-foreground">{value}</h3>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          {trend && (
            <span className={`text-[10px] font-semibold ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.value}
            </span>
          )}
        </div>
        {icon && (
          <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 2. Realtime Mini Storage Chart
interface RealtimeChartWidgetProps {
  data: Array<{ date: string; size: number }>;
}

export function RealtimeChartWidget({ data }: RealtimeChartWidgetProps) {
  return (
    <div className="border rounded-xl p-4 bg-card space-y-3">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Storage IO Traffic</h3>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="widgetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 8 }} />
            <YAxis tick={{ fontSize: 8 }} />
            <Tooltip formatter={(val: unknown) => [`${(val as number).toFixed(1)} MB`, 'Storage']} />
            <Area type="monotone" dataKey="size" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#widgetGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 3. Workspace Health Widgets
interface WorkspaceHealthWidgetProps {
  usedPercent: number;
  ocrSuccessPercent: number;
  queueHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

export function WorkspaceHealthWidget({ usedPercent, ocrSuccessPercent, queueHealth }: WorkspaceHealthWidgetProps) {
  return (
    <div className="border rounded-xl p-4 bg-card space-y-4">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Workspace Diagnostic Index</h3>
      
      <div className="space-y-3">
        {/* Quota Usage */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-foreground">
            <span>Disk Quota Utilization</span>
            <span>{usedPercent.toFixed(1)}%</span>
          </div>
          <Progress value={usedPercent} className="h-1.5" />
        </div>

        {/* OCR Engine Success */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-foreground">
            <span>OCR Parsing Accuracy</span>
            <span>{ocrSuccessPercent.toFixed(1)}%</span>
          </div>
          <Progress value={ocrSuccessPercent} className="h-1.5 bg-emerald-500/10" />
        </div>

        {/* Queue Health & System Status */}
        <div className="grid grid-cols-2 gap-3 text-[11px] pt-1.5 border-t">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold">Queue Pipeline</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${queueHealth === 'HEALTHY' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`} />
              {queueHealth}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold">Audit Registry</span>
            <div className="flex items-center gap-1.5 mt-1 font-bold text-emerald-600 dark:text-emerald-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              VALIDATED
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
