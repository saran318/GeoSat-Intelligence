import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';

interface RegionSelectorProps {
  regions: string[];
  value: string;
  onChange: (region: string) => void;
  className?: string;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  regions,
  value,
  onChange,
  className = '',
}) => {
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regions;
    const matches = regions.filter((r) => r.toLowerCase().includes(q));
    if (value && !matches.includes(value) && regions.includes(value)) {
      return [value, ...matches];
    }
    return matches;
  }, [regions, query, value]);

  const handleQueryChange = (next: string) => {
    setQuery(next);
    const q = next.trim().toLowerCase();
    if (q) {
      const exact = regions.find((r) => r.toLowerCase() === q);
      const firstMatch = exact || regions.find((r) => r.toLowerCase().includes(q));
      if (firstMatch && firstMatch !== value) {
        onChange(firstMatch);
      }
    }
  };

  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };

  return (
    <div className={`flex flex-wrap sm:flex-nowrap items-center gap-2 ${className}`}>
      {/* District Dropdown */}
      <div className="relative flex-1 min-w-0">
        <select
          aria-label="Select region"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-muted/60 hover:bg-muted text-foreground text-sm font-medium border border-border rounded-xl pl-3.5 pr-8 py-2 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all cursor-pointer appearance-none shadow-xs"
        >
          {filtered.map((name) => (
            <option key={name} value={name} className="bg-card text-foreground py-1">
              {name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
          <ChevronRight className="h-4 w-4 rotate-90" />
        </div>
      </div>

      {/* Compact Search Icon Button (expands on click) */}
      {!searchOpen ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          title="Search district"
          aria-label="Search district"
          className="h-9 w-9 shrink-0 rounded-xl bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <div className="relative w-full sm:w-40 shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                closeSearch();
              }
            }}
            placeholder="District..."
            aria-label="Search district"
            className="w-full bg-muted/60 text-foreground text-xs border border-primary/50 rounded-xl pl-8 pr-7 py-2 outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="button"
            onClick={closeSearch}
            title="Close search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
