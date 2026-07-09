import { Progress } from '@/components/ui/progress';
import { HardDrive } from 'lucide-react';

interface QuotaWidgetProps {
  used: number;
  quota: number; // in GB
}

export function QuotaWidget({ used, quota }: QuotaWidgetProps) {
  const usedGB = used / (1024 * 1024 * 1024);
  const percentage = Math.min(100, Math.round((usedGB / quota) * 100));

  const formatSize = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  return (
    <div className="border rounded-xl p-5 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold">Workspace Storage Quota</h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30">
          {percentage}% Used
        </span>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatSize(used)} Used</span>
        <span>{quota} GB Total</span>
      </div>
    </div>
  );
}
