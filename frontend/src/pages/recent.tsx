import { Clock } from 'lucide-react';
import { RecentFiles } from '@/features/recent/components/RecentFiles';

export function RecentPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6 text-indigo-600" />
          Recent Files
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review files you recently uploaded, opened, modified, or shared.
        </p>
      </div>

      <RecentFiles />
    </div>
  );
}
export default RecentPage;
