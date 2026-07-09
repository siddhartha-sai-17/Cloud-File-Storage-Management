import { useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePreview } from '../hooks/usePreview';
import { PreviewToolbar } from './PreviewToolbar';
import { PreviewViewer } from './PreviewViewer';
import { OCRResultCard } from '../../ocr/components/OCRResultCard';
import { Calendar, User, HardDrive, Info } from 'lucide-react';
import { formatSize } from '../../storage/utils/icons';

interface PreviewModalProps {
  fileId: number;
  isOpen: boolean;
  onClose: () => void;
  // Metadata fields passed from storage item for instant sidebar details
  filename: string;
  size: number;
  owner?: string;
  createdDate?: string;
  confidenceScore?: number;
  tags?: string;
  category?: string;
}

export function PreviewModal({
  fileId,
  isOpen,
  onClose,
  filename,
  size,
  owner,
  createdDate,
  confidenceScore,
  tags,
  category,
}: PreviewModalProps) {
  const {
    previewData,
    isLoading,
    error,
    objectUrl,
    zoom,
    isFullscreen,
    setIsFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  } = usePreview(fileId);

  // Focus restoration on close
  const triggerElementRef = typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null;
  useEffect(() => {
    if (!isOpen && triggerElementRef) {
      triggerElementRef.focus();
    }
  }, [isOpen, triggerElementRef]);

  const handleDownload = () => {
    if (!objectUrl) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getZoomable = () => {
    const mime = previewData?.contentType || '';
    return mime.startsWith('image/');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-7xl h-[85vh] p-0 overflow-hidden flex flex-col gap-0 outline-none ${isFullscreen ? 'max-w-full h-screen rounded-none border-none' : ''}`}>
        <DialogTitle className="sr-only">Previewing {filename}</DialogTitle>
        <DialogDescription className="sr-only">Inline document detail viewer and OCR analytics sidebars</DialogDescription>

        <PreviewToolbar
          zoomable={getZoomable()}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onDownload={handleDownload}
          onClose={onClose}
        />

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Preview canvas area */}
          <div className="flex-1 overflow-hidden relative flex items-center justify-center min-w-0 bg-muted/5">
            {isLoading ? (
              <div className="text-sm font-medium animate-pulse text-muted-foreground">Loading preview resource...</div>
            ) : error ? (
              <div className="text-sm text-destructive font-medium p-6 border rounded bg-destructive/5 max-w-sm text-center">
                Failed to load document preview.
              </div>
            ) : (
              <PreviewViewer
                contentType={previewData?.contentType || ''}
                filename={filename}
                objectUrl={objectUrl}
                contentPreview={previewData?.contentPreview}
                zoom={zoom}
                onDownload={handleDownload}
              />
            )}
          </div>

          {/* Sidebar metadata details & OCR Panel */}
          {!isFullscreen && (
            <aside className="w-80 border-l overflow-y-auto bg-card p-4 space-y-5 hidden md:block shrink-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">File Details</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Name */}
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium truncate" title={filename}>{filename}</span>
                  </div>

                  {/* Size */}
                  <div className="flex items-center justify-between py-1 border-b">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <HardDrive className="h-3.5 w-3.5" />
                      <span>Size</span>
                    </div>
                    <span className="font-medium">{formatSize(size)}</span>
                  </div>

                  {/* Created Date */}
                  {createdDate && (
                    <div className="flex items-center justify-between py-1 border-b">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Uploaded</span>
                      </div>
                      <span className="font-medium">{new Date(createdDate).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Owner */}
                  {owner && (
                    <div className="flex items-center justify-between py-1 border-b">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>Owner</span>
                      </div>
                      <span className="font-medium">{owner}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* OCR Results widget (renders for images and PDFs) */}
              {(previewData?.contentType.startsWith('image/') || previewData?.contentType === 'application/pdf') && (
                <OCRResultCard
                  fileId={fileId}
                  confidenceScore={confidenceScore}
                  tags={tags}
                  category={category}
                />
              )}
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
