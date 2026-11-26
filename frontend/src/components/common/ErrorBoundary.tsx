import React from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onGoHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    this.props.onGoHome?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-md">
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The application encountered an unexpected error. The details have been logged to the
              browser console.
            </p>
            {this.state.error?.message && (
              <p className="text-xs font-mono bg-muted rounded-lg px-3 py-2 text-muted-foreground break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-background border border-border hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
