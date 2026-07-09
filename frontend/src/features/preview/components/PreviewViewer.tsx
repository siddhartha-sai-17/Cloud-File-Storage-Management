import { FileText, FileCode, Music, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewViewerProps {
  contentType: string;
  filename: string;
  objectUrl: string | null;
  contentPreview?: string;
  zoom: number;
  onDownload: () => void;
}

export function PreviewViewer({
  contentType,
  filename,
  objectUrl,
  contentPreview,
  zoom,
  onDownload,
}: PreviewViewerProps) {
  const mime = contentType.toLowerCase();

  // Helper check for code extensions
  const isCode = () => {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['js', 'ts', 'jsx', 'tsx', 'json', 'xml', 'html', 'css', 'java', 'py', 'go', 'rs', 'sh'].includes(ext || '');
  };

  // 1. Image Viewer
  if (mime.startsWith('image/')) {
    if (!objectUrl) return <div className="text-sm p-4">Loading Image...</div>;
    return (
      <div className="flex items-center justify-center w-full h-full overflow-auto bg-black/5 dark:bg-black/40">
        <img
          src={objectUrl}
          alt={filename}
          style={{ transform: `scale(${zoom / 100})`, transition: 'transform 0.1s ease-out' }}
          className="max-w-full max-h-full object-contain shadow-md rounded"
        />
      </div>
    );
  }

  // 2. PDF Viewer
  if (mime === 'application/pdf') {
    if (!objectUrl) return <div className="text-sm p-4">Loading PDF...</div>;
    return (
      <div className="w-full h-full bg-muted/30">
        <iframe
          src={`${objectUrl}#toolbar=0`}
          title={filename}
          className="w-full h-full border-none"
        />
      </div>
    );
  }

  // 3. Audio Viewer
  if (mime.startsWith('audio/')) {
    if (!objectUrl) return <div className="text-sm p-4">Loading Audio...</div>;
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-muted/10 p-6">
        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Music className="h-8 w-8" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-sm">{filename}</p>
          <p className="text-xs text-muted-foreground">Audio Track</p>
        </div>
        <audio src={objectUrl} controls className="w-80" />
      </div>
    );
  }

  // 4. Video Viewer
  if (mime.startsWith('video/')) {
    if (!objectUrl) return <div className="text-sm p-4">Loading Video...</div>;
    return (
      <div className="flex items-center justify-center w-full h-full bg-black/90 p-4">
        <video src={objectUrl} controls className="max-w-full max-h-full rounded" />
      </div>
    );
  }

  // 5. Plain Text, Markdown or Code Viewers
  if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || isCode() || filename.endsWith('.md')) {
    const isMarkdown = filename.endsWith('.md');
    return (
      <div className="w-full h-full overflow-auto bg-card p-6 border-r text-foreground">
        <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-muted-foreground border-b pb-2">
          {isMarkdown ? <FileText className="h-4 w-4" /> : <FileCode className="h-4 w-4" />}
          <span>{isMarkdown ? 'Markdown Excerpt (First 2KB)' : 'Source File View (First 2KB)'}</span>
        </div>
        <pre className="font-mono text-xs whitespace-pre-wrap leading-relaxed select-text bg-muted/40 p-4 rounded-md border">
          {contentPreview || 'No content preview details available.'}
        </pre>
      </div>
    );
  }

  // 6. Fallback Preview (unsupported formats)
  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full bg-muted/10 p-10 text-center">
      <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
        <FileDown className="h-8 w-8" />
      </div>
      <div>
        <h4 className="font-semibold text-sm">{filename}</h4>
        <p className="text-xs text-muted-foreground max-w-xs mt-1">
          This file format is not supported for inline previewing. You can download the file directly to view it.
        </p>
      </div>
      <Button onClick={onDownload} size="sm" className="gap-2">
        <FileDown className="h-4 w-4" />
        Download File
      </Button>
    </div>
  );
}
