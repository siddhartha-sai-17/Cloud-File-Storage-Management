import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/features/search/services/search.service';
import { SearchHighlight } from '@/features/search/components/SearchHighlight';
import { SearchEmptyState } from '@/features/search/components/SearchEmptyState';
import { SearchLoading } from '@/features/search/components/SearchLoading';
import { PreviewModal } from '@/features/preview/components/PreviewModal';
import { VersionTimeline } from '@/features/versions/components/VersionTimeline';
import { getFileIcon } from '@/features/storage/utils/icons';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Download, Eye, History } from 'lucide-react';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get('query') || '';

  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('filename');
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  // Preview / Version history modal state
  const [previewItem, setPreviewItem] = useState<{
    id: number;
    name: string;
    size: number;
    owner?: string;
    category?: string;
    tags?: string;
    confidenceScore?: number;
  } | null>(null);

  const [timelineItem, setTimelineItem] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Fetch search results
  const { data, isLoading } = useQuery({
    queryKey: ['search-results', queryParam, page, sortBy, direction],
    queryFn: () =>
      searchService.search({
        query: queryParam,
        page,
        size: 15,
        sortBy,
        direction,
      }),
    enabled: !!queryParam.trim(),
  });

  const handleDownload = async (fileId: number, filename: string) => {
    try {
      const response = await fetch(`/api/storage/download/${fileId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      console.error('Download failed');
    }
  };

  const handleToggleDirection = () => {
    setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Results matching: <span className="font-semibold text-primary">"{queryParam}"</span>
          </p>
        </div>

        {/* Sorting options */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
            aria-label="Sort by attribute"
          >
            <option value="filename">Filename</option>
            <option value="score">Relevance Score</option>
            <option value="size">File Size</option>
            <option value="createdDate">Created Date</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleDirection}
            className="h-8 w-8"
            title="Toggle sort direction"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main viewport */}
      {isLoading ? (
        <SearchLoading />
      ) : !data || data.content.length === 0 ? (
        <SearchEmptyState />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3">
            {data.content.map((item) => {
              // Standard icons fallback
              const FileIcon = getFileIcon(item.filename || item.title || 'file', 'FILE');

              return (
                <div
                  key={item.entityId}
                  onDoubleClick={() => {
                    if (item.entityType === 'FILE' && item.fileId) {
                      setPreviewItem({
                        id: item.fileId,
                        name: item.filename || 'file',
                        size: 0, // Fallback metadata
                        owner: item.owner,
                        category: item.category,
                      });
                    }
                  }}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors select-none group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-1 h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <FileIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">
                          <SearchHighlight text={item.filename || item.title || 'Unnamed Entity'} query={queryParam} />
                        </span>
                        {item.category && (
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded capitalize">
                            {item.category.toLowerCase()}
                          </span>
                        )}
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase">
                          {item.entityType}
                        </span>
                      </div>

                      {/* Display snippet excerpts */}
                      {item.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-2xl select-text leading-relaxed">
                          <SearchHighlight text={item.snippet} query={queryParam} />
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.folder && <span>Folder: {item.folder}</span>}
                        <span>Relevance: {Math.round(item.score * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  {item.entityType === 'FILE' && item.fileId && (
                    <div className="flex items-center gap-2 self-end sm:self-auto opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setPreviewItem({
                            id: item.fileId!,
                            name: item.filename || 'file',
                            size: 0,
                            owner: item.owner,
                            category: item.category,
                          })
                        }
                        className="h-8 px-2.5 text-xs gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setTimelineItem({
                            id: item.fileId!,
                            name: item.filename || 'file',
                          })
                        }
                        className="h-8 px-2.5 text-xs gap-1.5 text-primary hover:bg-primary/10"
                      >
                        <History className="h-3.5 w-3.5" />
                        Versions
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(item.fileId!, item.filename || 'file')}
                        className="h-8 w-8"
                        title="Download file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-xs text-muted-foreground">
                Page {page + 1} of {data.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, data.totalPages - 1))}
                  disabled={page === data.totalPages - 1}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview modal overlay wrapper */}
      {previewItem && (
        <PreviewModal
          fileId={previewItem.id}
          filename={previewItem.name}
          size={previewItem.size}
          owner={previewItem.owner}
          category={previewItem.category}
          isOpen={previewItem !== null}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Version timeline sheet drawer */}
      {timelineItem && (
        <VersionTimeline
          fileId={timelineItem.id}
          filename={timelineItem.name}
          isOpen={timelineItem !== null}
          onClose={() => setTimelineItem(null)}
        />
      )}
    </div>
  );
}
export default SearchPage;
