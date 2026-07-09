export interface PreviewDto {
  fileId: number;
  filename: string;
  contentType: string;
  size: number;
  contentPreview?: string;
  thumbnailUrl?: string;
  metadata: Record<string, string>;
}
