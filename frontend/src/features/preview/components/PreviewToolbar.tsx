import { ZoomIn, ZoomOut, Maximize2, Minimize2, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PreviewToolbarProps {
  zoomable: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onDownload: () => void;
  onClose: () => void;
}

export function PreviewToolbar({
  zoomable,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  isFullscreen,
  onToggleFullscreen,
  onDownload,
  onClose,
}: PreviewToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/20">
      <div className="flex items-center gap-2">
        {zoomable && (
          <div className="flex items-center gap-1 border-r pr-2 mr-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut} title="Zoom Out">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <button
              onClick={onZoomReset}
              className="text-xs font-medium px-2 py-1 rounded hover:bg-muted"
              title="Reset Zoom"
            >
              {zoom}%
            </button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn} title="Zoom In">
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleFullscreen} title="Toggle Fullscreen">
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDownload} title="Download File">
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={onClose} title="Close Preview">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
