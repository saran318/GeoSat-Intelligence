import React, { useState, useEffect, useMemo } from 'react';
import type { DynamicWorldCity, DynamicWorldClassDef, DynamicWorldLayer, DynamicWorldChangeStats } from '@/api/dynamicWorldTypes';
import { buildClassMap } from '@/config/dynamicWorldClasses';
import { 
  Map as MapIcon, 
  Layers, 
  SlidersHorizontal, 
  Activity, 
  ArrowRightLeft,
  TrendingUp,
  Calendar,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { RegionSelector } from '@/components/shared/RegionSelector';

interface DynamicWorldControlsProps {
  cities: DynamicWorldCity[];
  classDefs?: DynamicWorldClassDef[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  availableLayers: DynamicWorldLayer[];
  selectedLayerId: string;
  onLayerChange: (layerId: string) => void;
  changeStats?: DynamicWorldChangeStats | null;
  loadingChangeStats?: boolean;
  changeStatsError?: string | null;
  onRetryChangeStats?: () => void;
}

export const DynamicWorldControls: React.FC<DynamicWorldControlsProps> = ({
  cities,
  classDefs,
  selectedCity,
  onCityChange,
  availableLayers,
  selectedLayerId,
  onLayerChange,
  changeStats,
  loadingChangeStats = false,
  changeStatsError,
  onRetryChangeStats,
}) => {
  // Extract all available landcover years from API
  const landcoverYears = availableLayers
    .filter((l) => l.type === 'landcover' && l.year)
    .map((l) => l.year as number)
    .sort((a, b) => a - b);

  const defaultYears = landcoverYears;
  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);

  // Unified internal states for year selections (initialized from API years when available)
  const [singleYear, setSingleYear] = useState<number>(landcoverYears[0] ?? 0);
  const [sharedFromYear, setSharedFromYear] = useState<number>(landcoverYears[0] ?? 0);
  const [sharedToYear, setSharedToYear] = useState<number>(landcoverYears[landcoverYears.length - 1] ?? 0);

  useEffect(() => {
    if (landcoverYears.length > 0) {
      setSingleYear((prev) => (landcoverYears.includes(prev) ? prev : landcoverYears[0]));
      setSharedFromYear((prev) => (landcoverYears.includes(prev) ? prev : landcoverYears[0]));
      setSharedToYear((prev) => (landcoverYears.includes(prev) ? prev : landcoverYears[landcoverYears.length - 1]));
    }
  }, [landcoverYears.join(',')]);

  // Determine active mode category
  const activeMode: 'landcover' | 'swipe' | 'change' | 'transition' = (() => {
    if (selectedLayerId.startsWith('swipe_')) return 'swipe';
    if (selectedLayerId.startsWith('change_')) return 'change';
    if (selectedLayerId.startsWith('transition_')) return 'transition';
    return 'landcover';
  })();

  // Synchronize dropdown state with external selectedLayerId
  useEffect(() => {
    const periodMatch = selectedLayerId.match(/^(?:swipe|change|transition)_(\d{4})_(\d{4})$/);
    if (periodMatch) {
      setSharedFromYear(Number(periodMatch[1]));
      setSharedToYear(Number(periodMatch[2]));
    } else if (selectedLayerId.startsWith('dynamic_world_')) {
      const y = Number(selectedLayerId.replace('dynamic_world_', ''));
      if (!isNaN(y)) setSingleYear(y);
    }
  }, [selectedLayerId]);

  // Handlers for switching mode & year
  const handleModeChange = (newMode: 'landcover' | 'swipe' | 'change' | 'transition') => {
    if (newMode === 'landcover') {
      onLayerChange(`dynamic_world_${singleYear}`);
    } else {
      onLayerChange(`${newMode}_${sharedFromYear}_${sharedToYear}`);
    }
  };

  const handleYearChange = (from: number, to: number) => {
    setSharedFromYear(from);
    setSharedToYear(to);
    if (activeMode !== 'landcover') {
      onLayerChange(`${activeMode}_${from}_${to}`);
    }
  };

  const handleSingleYearChange = (year: number) => {
    setSingleYear(year);
    onLayerChange(`dynamic_world_${year}`);
  };

  const isComparisonMode = activeMode === 'swipe' || activeMode === 'change' || activeMode === 'transition';

  // Calculate net change per class sorted by size of change
  const classNetChanges = useMemo(() => {
    if (!changeStats?.classes || !changeStats.valid_pixels) return [];
    
    return Object.entries(changeStats.classes)
      .map(([className, item]) => {
        const fromPct = (item.count_from / changeStats.valid_pixels) * 100;
        const toPct = (item.count_to / changeStats.valid_pixels) * 100;
        const diff = toPct - fromPct;
        
        const classEntry = Object.values(classMap).find(
          c => c.name.toLowerCase() === className.toLowerCase()
        );
        
        return {
          className,
          fromPct,
          toPct,
          diff,
          absDiff: Math.abs(diff),
          color: classEntry?.color || '#CCCCCC',
        };
      })
      .filter(item => item.absDiff > 0.01) // Exclude 0 or negligible changes
      .sort((a, b) => b.absDiff - a.absDiff);
  }, [changeStats]);

  return (
    <aside className="w-full flex flex-col gap-5 select-none font-sans">
      {/* A. Dashboard Introduction Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs transition-all">
        <div className="flex items-center gap-2 text-primary font-mono text-[11px] font-semibold uppercase tracking-wider mb-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>GEOSPATIAL INTELLIGENCE · LAND COVER</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground leading-snug">
          Land Cover & Change Analysis
        </h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          Multi-temporal land-cover classifications (2019–2025) across Tamil Nadu regions.
        </p>
      </div>

      {/* B. Target Region Selector Card */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
            <MapIcon className="h-3.5 w-3.5 text-primary" /> Target Region
          </span>
          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-mono font-medium">
            Tamil Nadu
          </span>
        </label>
        
        <RegionSelector
          regions={cities.map((c) => c.name)}
          value={selectedCity}
          onChange={onCityChange}
        />
      </div>

      {/* C. Consolidated Layer Mode & Adaptive Year Controls */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
        <div className="flex items-center justify-between pb-1">
          <label className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-1.5 font-semibold text-foreground/80">
            <Layers className="h-3.5 w-3.5 text-primary" /> Layer Mode
          </label>
          <span className="text-[10px] font-mono text-muted-foreground">
            {activeMode === 'landcover' ? 'Single Year' : 'Dual Year Comparison'}
          </span>
        </div>

        {/* 1. Mode Selector Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'landcover', label: 'Land Cover', desc: 'Single year map', icon: MapIcon },
            { id: 'swipe', label: 'Swipe Curtain', desc: 'Slide to compare years', icon: SlidersHorizontal },
            { id: 'change', label: 'Binary Change', desc: 'Areas that changed', icon: Activity },
            { id: 'transition', label: 'Class Transition', desc: 'What land turned into', icon: ArrowRightLeft },
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeChange(mode.id as 'landcover' | 'swipe' | 'change' | 'transition')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-secondary/40 border-primary ring-1 ring-primary/30 shadow-xs'
                    : 'bg-card hover:bg-muted/40 border-border/70 hover:border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {isActive && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${isActive ? 'text-primary font-bold' : 'text-foreground'}`}>
                    {mode.label}
                  </h4>
                  <p className="text-[10px] text-muted-foreground">{mode.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* 2. Single Shared Year Control adapting to the active mode */}
        <div className="pt-2 border-t border-border/50">
          {activeMode === 'landcover' ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground uppercase">Year:</span>
              <select
                value={singleYear}
                onChange={(e) => handleSingleYearChange(Number(e.target.value))}
                className="flex-1 bg-background text-foreground text-xs font-mono font-medium border border-border/80 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
              >
                {defaultYears.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" /> From:
                </span>
                <select
                  value={sharedFromYear}
                  onChange={(e) => handleYearChange(Number(e.target.value), sharedToYear)}
                  className="w-full bg-background text-foreground text-xs font-mono font-medium border border-border/80 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  {defaultYears.filter((y) => y < sharedToYear).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-primary" /> To:
                </span>
                <select
                  value={sharedToYear}
                  onChange={(e) => handleYearChange(sharedFromYear, Number(e.target.value))}
                  className="w-full bg-background text-foreground text-xs font-mono font-medium border border-border/80 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs"
                >
                  {defaultYears.filter((y) => y > sharedFromYear).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* D. Comparison Summary Card (Displayed when Comparison/Swipe Mode is active) */}
      {isComparisonMode && (
        <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider text-primary">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Comparison Summary</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">
              {changeStats ? `${changeStats.from_year} ↔ ${changeStats.to_year}` : 'Comparison period'}
            </span>
          </div>

          {loadingChangeStats ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground font-mono text-xs">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Calculating pixel stats...</span>
            </div>
          ) : changeStatsError ? (
            <div className="py-4 px-3 rounded-xl bg-destructive/10 border border-destructive/20 flex flex-col items-center text-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{changeStatsError}</span>
              </div>
              {onRetryChangeStats && (
                <button
                  type="button"
                  onClick={onRetryChangeStats}
                  className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-background hover:bg-muted text-foreground border border-border cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3 text-primary" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          ) : changeStats ? (
            <div className="flex flex-col gap-3">
              {/* Overall Shift Metric */}
              <div className="flex justify-between items-center text-xs font-mono pb-2 border-b border-border/40">
                <span className="text-muted-foreground">Overall Altered</span>
                <span className="font-bold text-[#ED022A]">
                  {changeStats.changed_percentage.toFixed(1)}%
                </span>
              </div>

              {/* Net Change per Class (sorted by size of change) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block mb-1">
                  Net Shift by Class
                </span>
                {classNetChanges.map((item) => {
                  const isPositive = item.diff > 0;
                  return (
                    <div key={item.className} className="flex items-center justify-between text-xs font-mono py-0.5">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-xs border border-black/10"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate text-foreground font-medium">{item.className}</span>
                      </div>
                      <span className={`font-bold shrink-0 ${isPositive ? 'text-emerald-500' : 'text-[#ED022A]'}`}>
                        {isPositive ? '+' : ''}{item.diff.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="pt-2 border-t border-border/40 space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Stability Index</span>
                  <span>{changeStats.unchanged_percentage.toFixed(1)}% unchanged</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${changeStats.unchanged_percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 px-3 rounded-xl bg-muted/40 border border-border/60 flex flex-col items-center text-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                Telemetry not available for this period.
              </span>
              {onRetryChangeStats && (
                <button
                  type="button"
                  onClick={onRetryChangeStats}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-lg bg-background hover:bg-muted text-foreground border border-border cursor-pointer transition-colors shadow-2xs"
                >
                  <RotateCcw className="h-3 w-3 text-primary" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
