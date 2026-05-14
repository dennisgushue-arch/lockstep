import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="mt-2">
              {this.state.error?.message || 'An unexpected error occurred'}
            </AlertDescription>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full sm:w-auto h-auto px-4 py-2 leading-tight whitespace-normal bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              Reload Page
            </button>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading spinner component
export function LoadingSpinner({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) {
  const sizeClass = {
    sm: 'w-4 h-4',
    default: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  return (
    <Loader2 className={`${sizeClass} animate-spin text-primary`} />
  );
}

// Full page loading
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      <p className="text-gray-400 mt-4">{message}</p>
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Icon className="w-16 h-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-2xl font-heading font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action}
    </div>
  );
}

// Error alert component
export function ErrorAlert({
  title = 'Error',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
        <span>{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full sm:w-auto h-auto leading-tight whitespace-normal text-left sm:text-right underline hover:no-underline"
          >
            Try again
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
}
