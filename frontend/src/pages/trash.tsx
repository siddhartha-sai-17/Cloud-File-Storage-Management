import { Trash2 } from 'lucide-react';
import { TrashExplorer } from '@/features/trash/components/TrashExplorer';

export function TrashPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-red-600" />
          Trash Bin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage files and folders you have soft-deleted. Reclaim storage by purging files.
        </p>
      </div>

      <TrashExplorer />
    </div>
  );
}
export default TrashPage;
