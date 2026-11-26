import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

export const SectionSkeleton: React.FC<{ rows?: number; heightClass?: string }> = ({
  rows = 4,
  heightClass = 'h-8',
}) => (
  <div className="space-y-3 animate-pulse py-2" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={`${heightClass} bg-muted rounded-xl w-full`} />
    ))}
  </div>
);

export const SectionEmpty: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-8 px-4 text-center text-sm text-muted-foreground bg-muted/20 rounded-xl border border-border/50">
    {message}
  </div>
);

export const SectionError: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="py-6 px-4 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-3">
    <div className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-background hover:bg-muted text-foreground border border-border cursor-pointer transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5 text-primary" />
        <span>Retry</span>
      </button>
    )}
  </div>
);
