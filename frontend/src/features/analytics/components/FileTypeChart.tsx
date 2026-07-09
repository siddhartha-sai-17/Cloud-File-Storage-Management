import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface FileTypeChartProps {
  data: Record<string, number>;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

export function FileTypeChart({ data }: FileTypeChartProps) {
  const chartData = Object.entries(data).map(([name, bytes]) => ({
    name,
    size: bytes / (1024 * 1024), // display in MB
  }));

  return (
    <div className="vault-card p-5 space-y-4">
      <div>
        <p className="label-caps">Distribution</p>
        <h3 className="text-base font-bold text-white mt-1">Storage by File Type</h3>
      </div>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[12px] bg-white/[0.02] border border-dashed border-white/[0.08]">
            <p className="text-[12px] text-[#475569] font-medium">No type distribution data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis 
                dataKey="name" 
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
              <Bar dataKey="size" radius={[6, 6, 0, 0]} maxBarSize={32}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
