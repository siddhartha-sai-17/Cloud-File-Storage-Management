import { TrendingUp, HardDrive, Files } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StorageOverviewProps {
  usedBytes: number;
  growthPercentage: number;
  largestCount: number;
}

export function StorageOverview({ usedBytes, growthPercentage, largestCount }: StorageOverviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Storage Consumed</p>
            <h3 className="text-xl font-bold mt-1">{formatSize(usedBytes)}</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center dark:bg-indigo-950/20">
            <HardDrive className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Monthly Storage Growth</p>
            <h3 className="text-xl font-bold mt-1">
              {growthPercentage >= 0 ? '+' : ''}
              {growthPercentage.toFixed(2)}%
            </h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center dark:bg-emerald-950/20">
            <TrendingUp className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>

      <Card className="border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Indexable Files</p>
            <h3 className="text-xl font-bold mt-1">{largestCount} items</h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center dark:bg-blue-950/20">
            <Files className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
