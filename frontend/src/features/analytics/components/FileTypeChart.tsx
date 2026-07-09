import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface FileTypeChartProps {
  data: Record<string, number>;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function FileTypeChart({ data }: FileTypeChartProps) {
  const chartData = Object.entries(data).map(([name, bytes]) => ({
    name,
    size: bytes / (1024 * 1024), // display in MB
  }));

  const formatValue = (value: number) => {
    return value.toFixed(2) + ' MB';
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <h3 className="text-sm font-bold">Storage by File Type</h3>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No type distribution data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: unknown) => formatValue(value as number)} />
              <Bar dataKey="size" radius={[4, 4, 0, 0]}>
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
