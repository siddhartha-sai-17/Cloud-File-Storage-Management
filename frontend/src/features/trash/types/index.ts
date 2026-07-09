export interface TrashItemDto {
  id: number;
  name: string;
  type: 'FILE' | 'FOLDER';
  size: number | null;
  deletedAt: string;
  deletedBy: string;
}

export interface BulkTrashRequest {
  fileIds: number[];
  folderIds: number[];
}
