import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string; // context identifier for nested boundaries
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate a unique error correlation ID
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log crash telemetry to centralized logging system
    logger.error(`Application crash caught by ErrorBoundary [${this.props.name || 'Global'}]`, 'ErrorBoundary', {
      errorId: this.state.errorId,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    logger.info(`ErrorBoundary [${this.props.name || 'Global'}] retry triggered`, 'ErrorBoundary', {
      errorId: this.state.errorId,
    });
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      showDetails: false,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-6 bg-background rounded-xl border border-destructive/20 shadow-md animate-in fade-in duration-300">
          <div className="max-w-md w-full space-y-6 text-center">
            {/* Warning Icon */}
            <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>

            {/* Error Messages */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An unexpected application error has occurred. Our engineers have been notified.
              </p>
              <div className="text-[10px] font-mono text-muted-foreground/80 mt-1 select-all">
                Error ID: <span className="font-semibold text-foreground">{this.state.errorId}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-3">
              <Button 
                onClick={this.handleRetry} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 h-9"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry Operation
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/'}
                className="text-xs px-4 h-9"
              >
                Go to Overview
              </Button>
            </div>

            {/* Developer telemetry diagnostics */}
            {isDev && this.state.error && (
              <div className="border rounded-lg text-left bg-muted/50 overflow-hidden">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-muted-foreground border-b hover:bg-muted/80 transition-colors"
                >
                  <span>TECHNICAL TELEMETRY DIAGNOSTICS (DEV MODE)</span>
                  {this.state.showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {this.state.showDetails && (
                  <pre className="p-3 text-[10px] font-mono text-rose-600 dark:text-rose-400 overflow-x-auto max-h-48 leading-normal select-text">
                    <span className="font-bold">{this.state.error.toString()}</span>
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
