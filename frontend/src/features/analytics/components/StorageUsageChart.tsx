import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StorageUsageChartProps {
  data: Record<string, number>;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-[#161F2F] px-3 py-2.5 shadow-vault-xl">
      <p className="text-[10px] font-semibold text-[#64748B] mb-1">{data.name}</p>
      <p className="text-[13px] font-bold text-white">
        {(data.value as number).toFixed(2)} MB
      </p>
    </div>
  );
};

export function StorageUsageChart({ data }: StorageUsageChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value: value / (1024 * 1024), // display in MB
  }));

  return (
    <div className="vault-card p-5 space-y-4">
      <div>
        <p className="label-caps">Ownership</p>
        <h3 className="text-base font-bold text-white mt-1">Storage by Owner</h3>
      </div>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[12px] bg-white/[0.02] border border-dashed border-white/[0.08]">
            <p className="text-[12px] text-[#475569] font-medium">No owner distribution data available</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
