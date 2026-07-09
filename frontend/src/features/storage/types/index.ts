export interface StorageItem {
  id: number;
  name: string;
  type: 'FILE' | 'FOLDER';
  size: number | null;
  createdDate?: string;
  starred: boolean;
  category?: string;
  confidenceScore?: number;
  tags?: string;
  versionValue?: number;
  classification?: string;
}

export interface StorageAnalytics {
  storageUsage: number;
  fileCount: number;
  duplicateSavings: number;
  starredCount: number;
  trashCount: number;
}

export interface UploadSessionResponse {
  sessionId: string;
  filename: string;
  size: number;
  status: string;
  clientUploadId?: string;
  chunkSize?: number;
  totalChunks?: number;
}

export interface UploadChunkResponse {
  sessionId: string;
  chunkNumber: number;
  status: string;
}

export interface UploadCompletionResponse {
  fileId: number;
  filename: string;
  size: number;
  checksum: string;
  status: string;
}

export interface UploadTask {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'IDLE' | 'INITIALIZING' | 'UPLOADING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  error?: string;
  sessionId?: string;
  chunkIndex?: number;
  totalChunks?: number;
  chunkSize?: number;
  uploadedBytes?: number;
  xhrList?: XMLHttpRequest[]; // track open chunk upload requests for cancellation
}

export interface ActivityTimelineItem {
  id: number;
  workspaceId?: number;
  username: string;
  eventType: string;
  entityType: string;
  entityId: number;
  description: string;
  status: string;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface SearchResultDto {
  fileId?: number;
  filename?: string;
  owner?: string;
  folder?: string;
  category?: string;
  score?: number;
  matchedFields?: string[];
  snippet?: string;
  highlights?: string[];
  entityType?: string;
  entityId?: number;
  title?: string;
}


