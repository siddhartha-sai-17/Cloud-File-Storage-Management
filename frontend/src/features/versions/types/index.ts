export interface FileVersionDtoResponse {
  id: number;
  fileId: number;
  versionNumber: number;
  versionValue: number;
  storagePath: string;
  sha256: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  contentType: string;
  category?: string;
  confidence?: number;
  tags?: string;
  changeDescription?: string;
  restoredFromVersion?: number;
  currentVersion: boolean;
}
