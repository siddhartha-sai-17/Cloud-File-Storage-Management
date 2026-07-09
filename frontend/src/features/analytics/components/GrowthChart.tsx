import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface GrowthChartProps {
  monthly: Record<string, number>;
}

export function GrowthChart({ monthly }: GrowthChartProps) {
  const monthlyData = Object.entries(monthly)
    .map(([period, bytes]) => ({
      period,
      size: bytes / (1024 * 1024),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <h3 className="text-sm font-bold">Monthly Storage Growth Trend</h3>
      <div className="h-64">
        {monthlyData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No growth data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: unknown) => `${(value as number).toFixed(1)} MB`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="size"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Storage (MB)"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
