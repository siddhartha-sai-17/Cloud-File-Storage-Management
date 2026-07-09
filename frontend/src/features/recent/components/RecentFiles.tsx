import { useState } from 'react';
import { useRecentFiles } from '../hooks/useRecentFiles';
import { RecentActivityCard } from './RecentActivityCard';
import { PreviewModal } from '@/features/preview/components/PreviewModal';
import type { StorageItem } from '@/features/storage/types';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

export function RecentFiles() {
  const [filterType, setFilterType] = useState<'ALL' | 'UPLOADED' | 'OPENED' | 'MODIFIED'>('ALL');
  const [page, setPage] = useState(0);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);

  const { recentItems, isLoading, totalPages } = useRecentFiles(filterType, page, 20);

  const getGroupLabel = (dateStr?: string) => {
    if (!dateStr) return 'Older';
    const date = new Date(dateStr);
    const diffTime = Math.abs(Date.now() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'Today';
    if (diffDays <= 2) return 'Yesterday';
    if (diffDays <= 7) return 'Last 7 Days';
    return 'Older';
  };

  // Group items
  const grouped: Record<string, StorageItem[]> = {
    Today: [],
    Yesterday: [],
    'Last 7 Days': [],
    Older: [],
  };

  recentItems.forEach((item) => {
    const group = getGroupLabel(item.createdDate);
    grouped[group].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Category selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex gap-2">
          {(['ALL', 'UPLOADED', 'OPENED', 'MODIFIED'] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilterType(t);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                filterType === t
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-700 dark:bg-indigo-950/30'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              {t === 'ALL'
                ? 'All Actions'
                : t === 'UPLOADED'
                ? 'Uploaded'
                : t === 'OPENED'
                ? 'Opened'
                : 'Modified'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12 text-muted-foreground">Loading recent files…</div>
      ) : recentItems.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card space-y-2">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
          <h3 className="text-sm font-semibold">No recent activity</h3>
          <p className="text-xs text-muted-foreground">Files you upload or interact with will show up here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(['Today', 'Yesterday', 'Last 7 Days', 'Older'] as const).map((group) => {
            const items = grouped[group];
            if (items.length === 0) return null;

            return (
              <div key={group} className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {group}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => (
                    <RecentActivityCard
                      key={item.id}
                      item={item}
                      onPreview={(it) => setPreviewItem(it)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}

      {/* Preview overlay */}
      {previewItem && (
        <PreviewModal
          fileId={previewItem.id}
          filename={previewItem.name}
          size={previewItem.size || 0}
          owner={undefined}
          createdDate={previewItem.createdDate}
          confidenceScore={previewItem.confidenceScore}
          tags={previewItem.tags}
          category={previewItem.category}
          isOpen={previewItem !== null}
          onClose={() => setPreviewItem(null)}
        />
      )}
    </div>
  );
}
