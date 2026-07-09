import { useAdmin } from '../hooks/useAdmin';
import { Card, CardContent } from '@/components/ui/card';
import { FileIcon, AlertTriangle, ShieldCheck } from 'lucide-react';

export function StorageHealth() {
  const { duplicates, dupStats, isLoadingDuplicates } = useAdmin();

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const potentialSavingsBytes = dupStats?.potentialSavingsBytes || 0;
  const duplicateGroupsCount = dupStats?.duplicateGroupsCount || 0;
  const duplicateFilesCount = dupStats?.duplicateFilesCount || 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Deduplication Savings</p>
              <h3 className="text-xl font-bold mt-1 text-emerald-600">
                {formatSize(potentialSavingsBytes)}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Potential platform space reclaimed</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Duplicate Groups</p>
              <h3 className="text-xl font-bold mt-1">{duplicateGroupsCount} hashes</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unique SHA-256 fingerprint matches</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center dark:bg-amber-950/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Redundant Files</p>
              <h3 className="text-xl font-bold mt-1">{duplicateFilesCount} items</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total redundant file clones</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center dark:bg-indigo-950/20">
              <FileIcon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Duplicates Report Table */}
      <div className="border rounded-xl p-5 bg-card space-y-4">
        <h3 className="text-sm font-bold">Deduplication Registry Reports</h3>
        {isLoadingDuplicates ? (
          <div className="text-center py-8 text-muted-foreground">Generating deduplication report…</div>
        ) : duplicates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No duplicate files registered. Platform space is clean.</div>
        ) : (
          <div className="space-y-4">
            {duplicates.map((group) => (
              <div key={group.sha256} className="border rounded-lg p-4 bg-muted/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <span className="text-[10px] font-mono text-muted-foreground max-w-[200px] truncate" title={group.sha256}>
                    SHA-256: {group.sha256}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded dark:bg-amber-950/20">
                      {group.fileCount} Clones
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-950/20">
                      Wasting {formatSize(group.potentialSavings)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.duplicates.map((file) => (
                    <div key={file.id} className="flex items-center justify-between text-xs py-1">
                      <span className="truncate max-w-[300px] text-muted-foreground">{file.name}</span>
                      <span className="text-muted-foreground">{formatSize(file.size ?? undefined)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
