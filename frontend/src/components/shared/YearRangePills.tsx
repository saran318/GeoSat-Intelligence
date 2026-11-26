import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface YearRangePillsProps {
  years: number[];
  fromYear: number;
  toYear: number;
  onFromChange: (year: number) => void;
  onToChange: (year: number) => void;
  onSwap?: () => void;
}

export const YearRangePills: React.FC<YearRangePillsProps> = ({
  years,
  fromYear,
  toYear,
  onFromChange,
  onToChange,
  onSwap,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 bg-muted/50 border border-border/80 rounded-xl px-2.5 py-1.5">
        <span className="text-xs font-mono text-muted-foreground uppercase">From</span>
        <div className="flex flex-wrap gap-1">
          {years.filter((y) => y < toYear).map((y) => (
            <button
              key={`from-${y}`}
              type="button"
              onClick={() => onFromChange(y)}
              className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                y === fromYear
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground/80 hover:bg-muted'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {onSwap && (
        <button
          type="button"
          onClick={onSwap}
          title="Reset / toggle year span (From < To)"
          className="p-2 rounded-xl bg-muted/50 hover:bg-muted border border-border/80 text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex items-center gap-1.5 bg-muted/50 border border-border/80 rounded-xl px-2.5 py-1.5">
        <span className="text-xs font-mono text-muted-foreground uppercase">To</span>
        <div className="flex flex-wrap gap-1">
          {years.filter((y) => y > fromYear).map((y) => (
            <button
              key={`to-${y}`}
              type="button"
              onClick={() => onToChange(y)}
              className={`px-2 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                y === toYear
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground/80 hover:bg-muted'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
