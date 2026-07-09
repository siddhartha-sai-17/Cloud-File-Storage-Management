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
import { ArrowLeftRight, Download, Eye, History, Search } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <div className="max-w-[1400px] mx-auto p-4 space-y-6 animate-fade-in">
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <p className="label-caps font-bold">Query results</p>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Search className="h-7 w-7 text-[#6366F1]" />
            Search Results
          </h1>
          {queryParam && (
            <p className="text-sm text-[#64748B] mt-1">
              Results matching: <span className="font-bold text-[#818CF8]">"{queryParam}"</span>
            </p>
          )}
        </motion.div>

        {/* Sorting options */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex h-9 rounded-[10px] border border-white/[0.06] bg-[#0F172A] px-3 py-1.5 text-xs text-[#94A3B8] font-semibold focus:outline-none focus:border-[#6366F1]"
            aria-label="Sort by attribute"
          >
            <option value="filename">Filename</option>
            <option value="score">Relevance Score</option>
            <option value="size">File Size</option>
            <option value="createdDate">Created Date</option>
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleDirection}
            className="h-9 w-9 border border-white/[0.06] bg-[#0F172A] text-[#475569] hover:text-white hover:border-[#6366F1]/30 hover:bg-[#161F2F] rounded-[10px] transition-all"
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-white/[0.06] rounded-[16px] bg-[#111827] hover:bg-[#161F2F] hover:border-[#6366F1]/20 transition-all select-none group"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-1 h-8 w-8 rounded-[8px] bg-white/[0.03] border border-white/[0.05] flex items-center justify-center text-[#818CF8] shrink-0">
                      <FileIcon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[13.5px] text-white truncate">
                          <SearchHighlight text={item.filename || item.title || 'Unnamed Entity'} query={queryParam} />
                        </span>
                        {item.category && (
                          <span className="text-[10px] bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#818CF8] px-1.5 py-0.5 rounded-[5px] font-bold uppercase tracking-wide">
                            {item.category.toLowerCase()}
                          </span>
                        )}
                        <span className="text-[10px] bg-white/[0.04] border border-white/[0.06] text-[#475569] px-1.5 py-0.5 rounded-[5px] font-bold uppercase tracking-wide">
                          {item.entityType}
                        </span>
                      </div>

                      {/* Display snippet excerpts */}
                      {item.snippet && (
                        <p className="text-xs text-[#94A3B8] line-clamp-2 max-w-2xl select-text leading-relaxed">
                          <SearchHighlight text={item.snippet} query={queryParam} />
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-[#475569] font-semibold">
                        {item.owner && <span>Owner: {item.owner}</span>}
                        {item.folder && <span>Folder: {item.folder}</span>}
                        <span>Relevance: {Math.round(item.score * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  {item.entityType === 'FILE' && item.fileId && (
                    <div className="flex items-center gap-2 self-end sm:self-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
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
                        className="h-8 px-2.5 text-xs gap-1.5 text-[#94A3B8] hover:text-white hover:bg-white/[0.05] rounded-[8px]"
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
                        className="h-8 px-2.5 text-xs gap-1.5 text-[#818CF8] hover:text-white hover:bg-[#6366F1]/10 rounded-[8px]"
                      >
                        <History className="h-3.5 w-3.5" />
                        Versions
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(item.fileId!, item.filename || 'file')}
                        className="h-8 w-8 text-[#475569] hover:text-white hover:bg-white/[0.05] rounded-[8px]"
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
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
              <span className="text-xs text-[#475569] font-medium">
                Page {page + 1} of {data.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(p - 1, 0))}
                  disabled={page === 0}
                  className="h-8 text-xs text-[#94A3B8] border border-white/[0.06] bg-[#0F172A] rounded-[8px] hover:text-white disabled:opacity-50"
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(p + 1, data.totalPages - 1))}
                  disabled={page === data.totalPages - 1}
                  className="h-8 text-xs text-[#94A3B8] border border-white/[0.06] bg-[#0F172A] rounded-[8px] hover:text-white disabled:opacity-50"
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
