import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';
import type { ConnectionStatusType, UploadProgressDto } from '@/features/realtime/types';

interface RealtimeContextType {
  status: ConnectionStatusType;
  connect: () => void;
  disconnect: () => void;
  subscribeUpload: (sessionId: string) => void;
  unsubscribeUpload: (sessionId: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatusType>('DISCONNECTED');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const activeSubscriptionsRef = useRef<Set<string>>(new Set());

  // Connection config is a stable module-level constant (see RECONNECT_DELAYS above)

  const disconnect = useCallback(() => {
    // Clear reconnect timeouts
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Clear heartbeat
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatus('DISCONNECTED');
    reconnectAttemptRef.current = 0;
  }, []);

  const connect = useCallback(() => {
    if (!isAuthenticated || !token) {
      disconnect();
      return;
    }

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    // Clear previous heartbeat & timeouts
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    setStatus((prev) => (prev === 'DISCONNECTED' ? 'CONNECTING' : 'RECONNECTING'));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Integrate with port 8080 where backend runs
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/upload-progress?token=${token}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('CONNECTED');
        reconnectAttemptRef.current = 0;

        // Re-subscribe to any active sessions we tracked
        activeSubscriptionsRef.current.forEach((sessionId) => {
          ws.send(JSON.stringify({ action: 'subscribe', sessionId }));
        });

        // Set up heartbeat (every 25 seconds)
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            // Send ping message - backend will respond or just process it to prevent timeout
            ws.send(JSON.stringify({ action: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Check if payload is UploadProgressDto
          if (data && data.sessionId && typeof data.uploadPercentage === 'number') {
            const progress = data as UploadProgressDto;
            
            // Directly update the React Query cache for this session
            queryClient.setQueryData(['upload-progress', progress.sessionId], progress);
            
            // Also trigger invalidation on active uploads list
            if (progress.status === 'COMPLETED' || progress.status === 'FAILED') {
              queryClient.invalidateQueries({ queryKey: ['upload-history'] });
              queryClient.invalidateQueries({ queryKey: ['active-uploads'] });
            }
          }
        } catch {
          // Log or handle raw text frames
        }
      };

      ws.onclose = (event) => {
        socketRef.current = null;
        if (heartbeatIntervalRef.current) {
          window.clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Only attempt reconnect if it wasn't closed cleanly via manual disconnect()
        if (event.code !== 1000 && isAuthenticated) {
          const attempt = reconnectAttemptRef.current;
          const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
          reconnectAttemptRef.current = attempt + 1;
          setStatus('RECONNECTING');

          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, delay);
        } else {
          setStatus('DISCONNECTED');
        }
      };

      ws.onerror = () => {
        // Socket close event will handle the reconnect
      };
    } catch {
      setStatus('DISCONNECTED');
    }
  }, [isAuthenticated, token, disconnect, queryClient]);

  const subscribeUpload = useCallback((sessionId: string) => {
    activeSubscriptionsRef.current.add(sessionId);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'subscribe', sessionId }));
    }
  }, []);

  const unsubscribeUpload = useCallback((sessionId: string) => {
    activeSubscriptionsRef.current.delete(sessionId);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'unsubscribe', sessionId }));
    }
  }, []);

  // Connect automatically when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated, connect, disconnect]);

  return (
    <RealtimeContext.Provider value={{ status, connect, disconnect, subscribeUpload, unsubscribeUpload }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}
