import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { previewService } from '../services/preview.service';

export function usePreview(fileId: number) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);
  const [blobError, setBlobError] = useState<Error | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Fetch metadata excerpt using react-query
  const { data: previewData, isLoading: isLoadingMeta, error: metaError } = useQuery({
    queryKey: ['file-preview', fileId],
    queryFn: () => previewService.getMetadata(fileId),
  });

  // 2. Fetch binary blob and manage local Object URL lifecycle
  useEffect(() => {
    if (!previewData) return;

    const mime = previewData.contentType.toLowerCase();
    const needsBlob =
      mime.startsWith('image/') ||
      mime === 'application/pdf' ||
      mime.startsWith('video/') ||
      mime.startsWith('audio/');

    if (!needsBlob) {
      setObjectUrl(null);
      setIsLoadingBlob(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingBlob(true);
    setBlobError(null);

    previewService
      .downloadBlob(fileId, controller.signal)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setObjectUrl((prevUrl) => {
          if (prevUrl) URL.revokeObjectURL(prevUrl); // Revoke prior url immediately
          return url;
        });
        setIsLoadingBlob(false);
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') {
          setBlobError(err);
          setIsLoadingBlob(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [fileId, previewData]);

  // Clean up Object URL when hook unmounts
  useEffect(() => {
    return () => {
      setObjectUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    };
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const handleZoomReset = () => setZoom(100);

  return {
    previewData,
    isLoading: isLoadingMeta || isLoadingBlob,
    error: metaError || blobError,
    objectUrl,
    zoom,
    isFullscreen,
    setIsFullscreen,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
  };
}
