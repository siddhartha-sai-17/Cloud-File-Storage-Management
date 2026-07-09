import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface StorageTrendChartProps {
  data: Record<string, number>;
  title: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-[#161F2F] px-3 py-2.5 shadow-vault-xl">
      <p className="text-[10px] font-semibold text-[#64748B] mb-1">{label}</p>
      <p className="text-[13px] font-bold text-white">
        {(payload[0].value as number).toFixed(2)} MB
      </p>
    </div>
  );
};

export function StorageTrendChart({ data, title }: StorageTrendChartProps) {
  const chartData = Object.entries(data)
    .map(([date, bytes]) => ({
      date,
      size: bytes / (1024 * 1024),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="vault-card p-5 space-y-4">
      <div>
        <p className="label-caps">Chart</p>
        <h3 className="text-base font-bold text-white mt-1">{title}</h3>
      </div>
      <div className="h-60">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[12px] bg-white/[0.02] border border-dashed border-white/[0.08]">
            <p className="text-[12px] text-[#475569] font-medium">No historical trend data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id={`trendGrad-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#475569', fontFamily: 'Inter' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 9, fill: '#475569', fontFamily: 'Inter' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="size"
                stroke="#6366F1"
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#trendGrad-${title})`}
                dot={false}
                activeDot={{ r: 4, fill: '#6366F1', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
