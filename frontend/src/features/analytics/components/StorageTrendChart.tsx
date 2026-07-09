import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface StorageTrendChartProps {
  data: Record<string, number>;
  title: string;
}

export function StorageTrendChart({ data, title }: StorageTrendChartProps) {
  const chartData = Object.entries(data)
    .map(([date, bytes]) => ({
      date,
      size: bytes / (1024 * 1024), // display in MB
    }))
    // Sort chronologically if keys are dates
    .sort((a, b) => a.date.localeCompare(b.date));

  const formatValue = (value: number) => {
    return value.toFixed(2) + ' MB';
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="h-64">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No historical trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: unknown) => formatValue(value as number)} />
              <Area type="monotone" dataKey="size" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#trendGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
