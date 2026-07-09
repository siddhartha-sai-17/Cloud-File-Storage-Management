import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/utils/utils';

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryAction?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Something went wrong", 
  message = "An error occurred while loading this content.", 
  retryAction,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center animate-in fade-in-50", className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        {message}
      </p>
      {retryAction && (
        <Button onClick={retryAction} variant="outline" className="mt-6">
          Try Again
        </Button>
      )}
    </div>
  );
}
