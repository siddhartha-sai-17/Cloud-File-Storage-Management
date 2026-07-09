import { Cpu, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOCR } from '../hooks/useOCR';

function Badge({ children, className, variant = 'outline' }: { children: React.ReactNode; className?: string; variant?: string }) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const styles = variant === 'destructive' 
    ? "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
    : "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80";
  return (
    <div className={`${base} ${styles} ${className || ''}`}>
      {children}
    </div>
  );
}

interface OCRResultCardProps {
  fileId: number;
  confidenceScore?: number;
  tags?: string;
  category?: string;
}

export function OCRResultCard({
  fileId,
  confidenceScore,
  tags,
  category,
}: OCRResultCardProps) {
  const { status, reindex, isReindexing, isTimeout } = useOCR(fileId);

  const getStatusIcon = () => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-amber-500 animate-pulse" />;
      case 'PROCESSING':
        return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Cpu className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 animate-pulse">Processing</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
      case 'FAILED':
        return <Badge variant="destructive">{isTimeout ? 'Timeout' : 'Failed'}</Badge>;
      default:
        return <Badge variant="secondary">None</Badge>;
    }
  };

  return (
    <div className="border rounded-lg bg-card text-card-foreground p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-semibold text-sm">OCR Processing</span>
        </div>
        {getStatusBadge()}
      </div>

      {(status === 'PENDING' || status === 'PROCESSING') && (
        <div className="space-y-1">
          <Progress value={status === 'PROCESSING' ? 65 : 15} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground">Extracting text layout. This might take a few moments...</p>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div className="space-y-3">
          {confidenceScore !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Confidence Rating</span>
                <span className={confidenceScore > 0.8 ? 'text-emerald-500' : 'text-amber-500'}>
                  {Math.round(confidenceScore * 100)}%
                </span>
              </div>
              <Progress value={confidenceScore * 100} className="h-1.5" />
            </div>
          )}

          {category && (
            <div className="flex justify-between text-xs border-b pb-2">
              <span className="text-muted-foreground">AI Classification</span>
              <span className="font-medium capitalize">{category.toLowerCase()}</span>
            </div>
          )}

          {tags && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Generated Tags</span>
              <div className="flex flex-wrap gap-1">
                {tags.split(',').map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {status === 'FAILED' && (
        <div className="p-2 rounded bg-destructive/10 text-destructive text-xs flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {isTimeout
              ? 'OCR text extraction timed out (3-min limit). Please try forcing a re-index.'
              : 'Failed to extract text or content metadata from the uploaded file.'}
          </span>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => reindex()}
          disabled={isReindexing || status === 'PROCESSING'}
          className="h-8 text-xs gap-1.5"
        >
          <RefreshCw className={`h-3 w-3 ${isReindexing ? 'animate-spin' : ''}`} />
          Force Re-index
        </Button>
      </div>
    </div>
  );
}
