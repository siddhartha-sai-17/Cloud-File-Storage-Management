import { apiClient } from '../../../api/axios';

export interface CommentDto {
  id: number;
  fileId: number;
  workspaceId: number | null;
  userId: number;
  username: string;
  parentCommentId: number | null;
  content: string;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentDto[];
}

interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: number | null;
}

export interface UpdateCommentRequest {
  content: string;
}

export const commentService = {
  // GET /api/files/{fileId}/comments — paginated
  getFileComments: async (fileId: number, page = 0, size = 20): Promise<PaginatedResponse<CommentDto>> => {
    const response = await apiClient.get<PaginatedResponse<CommentDto>>(
      `/api/files/${fileId}/comments`,
      { params: { page, size } }
    );
    return response.data;
  },

  // POST /api/files/{fileId}/comments
  addComment: async (fileId: number, request: CreateCommentRequest): Promise<CommentDto> => {
    const response = await apiClient.post<CommentDto>(`/api/files/${fileId}/comments`, request);
    return response.data;
  },

  // PUT /api/comments/{commentId}
  editComment: async (commentId: number, request: UpdateCommentRequest): Promise<CommentDto> => {
    const response = await apiClient.put<CommentDto>(`/api/comments/${commentId}`, request);
    return response.data;
  },

  // DELETE /api/comments/{commentId}
  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(`/api/comments/${commentId}`);
  },
};
