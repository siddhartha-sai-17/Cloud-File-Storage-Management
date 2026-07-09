import { useRealtime } from '@/contexts/RealtimeProvider';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function ConnectionStatus() {
  const { status, connect } = useRealtime();

  const getStatusConfig = () => {
    switch (status) {
      case 'CONNECTED':
        return {
          color: 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30',
          label: 'Connected',
          dot: 'bg-emerald-500 animate-pulse',
          icon: <Wifi className="h-3.5 w-3.5" />,
        };
      case 'CONNECTING':
        return {
          color: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30',
          label: 'Connecting',
          dot: 'bg-amber-500 animate-bounce',
          icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
        };
      case 'RECONNECTING':
        return {
          color: 'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30',
          label: 'Reconnecting',
          dot: 'bg-amber-500 animate-bounce',
          icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
        };
      case 'DISCONNECTED':
      default:
        return {
          color: 'text-rose-500 bg-rose-50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30',
          label: 'Disconnected',
          dot: 'bg-rose-500',
          icon: <WifiOff className="h-3.5 w-3.5" />,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex items-center justify-between border rounded-lg px-3 py-2 text-xs font-semibold ${config.color}`}
      role="status"
      aria-live="polite"
      aria-label={`Realtime Connection Status: ${config.label}`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${config.dot}`} />
        <span className="flex items-center gap-1">
          {config.icon}
          {config.label}
        </span>
      </div>
      {status === 'DISCONNECTED' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={connect}
          className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/40 p-0"
          title="Manual Reconnect"
          aria-label="Trigger WebSocket Reconnect"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
