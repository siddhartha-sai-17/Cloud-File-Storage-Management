import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { API_URL } from '@/config/endpoints';
import { logger } from '@/utils/logger';

// Store pending request cancel tokens to abort duplicates
const pendingRequests = new Map<string, AbortController>();

const getRequestKey = (config: InternalAxiosRequestConfig) => {
  return `${config.method?.toUpperCase()}:${config.url}`;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const workspaceId = localStorage.getItem('activeWorkspaceId');
    if (workspaceId && config.headers) {
      config.headers['X-Workspace-Id'] = workspaceId;
    }

    // Request stopwatch
    (config as any).metadata = { startTime: Date.now() };

    // Automatic cancellation of duplicate concurrent requests
    const requestKey = getRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      const controller = pendingRequests.get(requestKey);
      controller?.abort(); // Cancel previous duplicate
      pendingRequests.delete(requestKey);
      logger.debug(`Cancelled duplicate concurrent request: ${requestKey}`, 'AxiosInterceptor');
    }

    const controller = new AbortController();
    config.signal = config.signal || controller.signal;
    pendingRequests.set(requestKey, controller);

    logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, 'AxiosInterceptor');
    return config;
  },
  (error) => {
    logger.error('API Request Error', 'AxiosInterceptor', { error });
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const config = response.config;
    const requestKey = getRequestKey(config);
    pendingRequests.delete(requestKey);

    // Calculate elapsed request time
    const startTime = (config as any).metadata?.startTime;
    const duration = startTime ? Date.now() - startTime : null;

    logger.info(`API Response: ${config.method?.toUpperCase()} ${config.url} - Status ${response.status} (${duration !== null ? `${duration}ms` : 'unknown'})`, 'AxiosInterceptor', {
      url: config.url,
      status: response.status,
      durationMs: duration,
    });

    return response;
  },
  (error) => {
    if (axios.isCancel(error)) {
      logger.debug('API Request explicitly cancelled', 'AxiosInterceptor');
      return Promise.reject(error);
    }

    const config = error.config;
    if (config) {
      const requestKey = getRequestKey(config);
      pendingRequests.delete(requestKey);
    }

    // Log the API error details
    logger.error(`API Error: ${config?.method?.toUpperCase()} ${config?.url} - Status ${error.response?.status || 'network_error'}`, 'AxiosInterceptor', {
      url: config?.url,
      status: error.response?.status,
      message: error.message,
    });

    // Centralized 401 redirect logic
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Prevent infinite redirect loops if already on login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
