import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface StorageChartProps {
  used: number;
  available: number;
}

export function StorageChart({ used, available }: StorageChartProps) {
  const data = [
    { name: 'Used Space', value: used },
    { name: 'Available Space', value: available },
  ];

  const total = used + available;
  const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0;

  const COLORS = ['#6366f1', '#111827'];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <Card className="col-span-1 bg-[#151b2f] border-[#1e293b]/40 shadow-lg glow-border overflow-hidden rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-gray-400 tracking-wider uppercase">Storage Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center h-64 relative">
        <div className="absolute top-[37%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-3xl font-extrabold text-white tracking-tight">{usedPercent}%</span>
          <span className="block text-[10px] text-gray-500 font-bold uppercase mt-0.5">Used</span>
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#151b2f" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: '#111827', borderColor: '#1e293b', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: any) => formatSize(Number(value || 0))} 
            />
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-gray-400 font-medium">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
