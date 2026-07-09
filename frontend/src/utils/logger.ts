type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  metadata?: Record<string, any>;
}

const IS_DEV = import.meta.env.DEV;

class Logger {
  private logEntries: LogEntry[] = [];
  private readonly maxLocalLogs = 100;

  private formatEntry(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };
  }

  private saveLocal(entry: LogEntry) {
    this.logEntries.push(entry);
    if (this.logEntries.length > this.maxLocalLogs) {
      this.logEntries.shift();
    }
  }

  private print(entry: LogEntry) {
    if (!IS_DEV) return;

    const styles: Record<LogLevel, string> = {
      DEBUG: 'color: #888888; font-weight: normal;',
      INFO: 'color: #0ea5e9; font-weight: 500;',
      WARN: 'color: #d97706; font-weight: bold;',
      ERROR: 'color: #dc2626; font-weight: bold; background-color: #fef2f2; padding: 2px 4px; border-radius: 4px;',
      AUDIT: 'color: #6366f1; font-weight: bold; text-decoration: underline;',
    };

    const time = new Date(entry.timestamp).toLocaleTimeString();
    const ctxString = entry.context ? `[${entry.context}]` : '';
    
    console.log(
      `%c[${entry.level}] ${time} ${ctxString} ${entry.message}`,
      styles[entry.level],
      entry.metadata ? entry.metadata : ''
    );
  }

  // Hook for future server-side log ingestion (e.g. POST /api/logs)
  private async sendToServer(entry: LogEntry) {
    if (IS_DEV) return;
    try {
      // In production, logs can be batched or sent directly
      // For now, it is set up to print nothing in production unless activated
      void entry;
    } catch {
      // Fail silently to prevent telemetry breaking client operations
    }
  }

  public debug(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.formatEntry('DEBUG', message, context, metadata);
    this.saveLocal(entry);
    this.print(entry);
  }

  public info(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.formatEntry('INFO', message, context, metadata);
    this.saveLocal(entry);
    this.print(entry);
  }

  public warn(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.formatEntry('WARN', message, context, metadata);
    this.saveLocal(entry);
    this.print(entry);
  }

  public error(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.formatEntry('ERROR', message, context, metadata);
    this.saveLocal(entry);
    this.print(entry);
    this.sendToServer(entry);
  }

  public audit(message: string, context?: string, metadata?: Record<string, any>) {
    const entry = this.formatEntry('AUDIT', message, context, metadata);
    this.saveLocal(entry);
    this.print(entry);
    this.sendToServer(entry);
  }

  public getHistory(): LogEntry[] {
    return [...this.logEntries];
  }

  public clearHistory() {
    this.logEntries = [];
  }
}

export const logger = new Logger();
export default logger;
