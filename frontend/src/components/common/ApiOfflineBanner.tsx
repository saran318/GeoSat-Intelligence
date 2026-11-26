import React from 'react';
import { WifiOff, RotateCcw } from 'lucide-react';

interface ApiOfflineBannerProps {
  /** Optional custom message; defaults to a generic API-unreachable message. */
  message?: string;
  onRetry?: () => void;
  /** If true, renders as a compact inline strip; default is a centred card. */
  compact?: boolean;
}

/**
 * Reusable component shown when the backend API is unreachable or returns an error.
 * Use on every page that fetches from the API.
 */
export const ApiOfflineBanner: React.FC<ApiOfflineBannerProps> = ({
  message = 'The API is currently unreachable. Some features may be unavailable.',
  onRetry,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded-lg bg-background hover:bg-muted text-foreground border border-border cursor-pointer transition-colors shrink-0"
          >
            <RotateCcw className="h-3 w-3 text-primary" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-14 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <WifiOff className="h-7 w-7 text-amber-500" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-base font-semibold text-foreground">API Offline</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </button>
      )}
    </div>
  );
};

export default ApiOfflineBanner;
