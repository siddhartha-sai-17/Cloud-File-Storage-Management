export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
  },
  FILES: {
    LIST: '/api/storage/files',
    UPLOAD_SESSION: '/api/uploads/session',
    UPLOAD_CHUNK: (sessionId: string) => `/api/uploads/session/${sessionId}/chunk`,
    COMPLETE: (sessionId: string) => `/api/uploads/session/${sessionId}/complete`,
    DELETE: (fileId: string) => `/api/storage/files/${fileId}`,
    DOWNLOAD: (fileId: string) => `/api/storage/files/${fileId}/download`,
    RENAME: (fileId: string) => `/api/storage/files/${fileId}/rename`,
    MOVE: (fileId: string) => `/api/storage/files/${fileId}/move`,
    COPY: (fileId: string) => `/api/storage/files/${fileId}/copy`,
    METADATA: (fileId: string) => `/api/storage/files/${fileId}`,
  },
  FOLDERS: {
    LIST: '/api/storage/folders',
    CREATE: '/api/storage/folders',
    DELETE: (folderId: string) => `/api/storage/folders/${folderId}`,
    RENAME: (folderId: string) => `/api/storage/folders/${folderId}/rename`,
  },
  VERSIONS: {
    LIST: (fileId: string) => `/api/versions/${fileId}`,
    RESTORE: (fileId: string, versionId: string) => `/api/versions/${fileId}/${versionId}/restore`,
    DOWNLOAD: (fileId: string, versionId: string) => `/api/versions/${fileId}/${versionId}/download`,
  },
  SEARCH: {
    QUERY: '/api/search',
  },
  OCR: {
    GET: (fileId: string) => `/api/ocr/${fileId}`,
  },
  WORKSPACES: {
    LIST: '/api/workspaces',
    CREATE: '/api/workspaces',
    GET: (workspaceId: string) => `/api/workspaces/${workspaceId}`,
    UPDATE: (workspaceId: string) => `/api/workspaces/${workspaceId}`,
    DELETE: (workspaceId: string) => `/api/workspaces/${workspaceId}`,
    MEMBERS: (workspaceId: string) => `/api/workspaces/${workspaceId}/members`,
    INVITE: (workspaceId: string) => `/api/workspaces/${workspaceId}/invite`,
  },
  SHARING: {
    CREATE_LINK: '/api/shares',
    LIST_LINKS: '/api/shares',
    DELETE_LINK: (shareId: string) => `/api/shares/${shareId}`,
    SHARED_WITH_ME: '/api/shares/shared-with-me',
    ACCESS_PUBLIC: (token: string) => `/api/public/shares/${token}`,
    ANALYTICS: (shareId: string) => `/api/shares/${shareId}/analytics`,
  },
  COMMENTS: {
    LIST: (fileId: string) => `/api/comments/file/${fileId}`,
    CREATE: '/api/comments',
    DELETE: (commentId: string) => `/api/comments/${commentId}`,
    REPLY: (commentId: string) => `/api/comments/${commentId}/reply`,
  },
  NOTIFICATIONS: {
    LIST: '/api/notifications',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
  },
  AUDIT: {
    LIST: '/api/audit',
  },
  ACTIVITY: {
    USER: '/api/activity/user',
    FILE: (fileId: string) => `/api/activity/file/${fileId}`,
  },
  FAVORITES: {
    LIST: '/api/favorites',
    ADD: (fileId: string) => `/api/favorites/${fileId}`,
    REMOVE: (fileId: string) => `/api/favorites/${fileId}`,
  },
  TRASH: {
    LIST: '/api/trash',
    RESTORE: (fileId: string) => `/api/trash/${fileId}/restore`,
    DELETE: (fileId: string) => `/api/trash/${fileId}`,
    EMPTY: '/api/trash/empty',
  },
  RECENT: {
    LIST: '/api/recent',
  },
  DUPLICATES: {
    REPORT: '/api/admin/duplicates/report',
  },
  ANALYTICS: {
    STORAGE: '/api/admin/analytics/storage',
    USER_ACTIVITY: '/api/admin/analytics/user-activity',
  },
  ADMIN: {
    STATS: '/api/admin/stats',
    USERS: '/api/admin/users',
    CONFIG: '/api/admin/config',
    HEALTH: '/actuator/health',
    METRICS: '/actuator/prometheus',
  },
  PREVIEW: {
    GET: (fileId: string) => `/api/preview/${fileId}`,
  },
};
