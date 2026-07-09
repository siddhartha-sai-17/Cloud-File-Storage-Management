import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface StorageChartProps {
  used: number;
  available: number;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-[12px] border border-white/[0.08] bg-[#161F2F] px-3 py-2 shadow-vault-xl">
      <p className="text-[10px] font-semibold text-[#64748B] mb-1">{item.name}</p>
      <p className="text-[13px] font-bold text-white">
        {formatSize(item.value)}
      </p>
    </div>
  );
};

export function StorageChart({ used, available }: StorageChartProps) {
  const data = [
    { name: 'Used Space', value: used },
    { name: 'Available Space', value: available },
  ];

  const total = used + available;
  const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;

  // Exact design colors: accent [#6366F1] and secondary surface [#1F2937]
  const COLORS = ['#6366F1', 'rgba(255, 255, 255, 0.04)'];

  return (
    <div className="vault-card col-span-1 p-5 flex flex-col justify-between">
      <div>
        <p className="label-caps">Workspace</p>
        <h3 className="text-base font-bold text-white mt-1">Storage Distribution</h3>
      </div>

      <div className="h-64 flex flex-col items-center justify-center relative mt-4">
        {/* Center label */}
        <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-3xl font-extrabold text-white tracking-tight">{usedPercent}%</span>
          <span className="block text-[10px] text-[#475569] font-bold uppercase mt-0.5">Used</span>
        </div>

        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="48%"
              innerRadius={58}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#111827" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-[12px] text-[#64748B] font-medium ml-1.5">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default StorageChart;
