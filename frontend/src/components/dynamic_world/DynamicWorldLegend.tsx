import React, { useState, useMemo } from 'react';
import { buildClassMap, CHANGE_CLASSES } from '@/config/dynamicWorldClasses';
import type { DynamicWorldClassDef, DynamicWorldLayer } from '@/api/dynamicWorldTypes';
import { ChevronDown, ChevronUp, Layers, Info, RotateCcw } from 'lucide-react';

interface DynamicWorldLegendProps {
  mode: DynamicWorldLayer['type'] | 'swipe';
  classDefs?: DynamicWorldClassDef[];
  samplingMeters?: number;
  hoveredClass?: number | null;
  isolatedClass?: number | null;
  onHoverClass?: (classId: number | null) => void;
  onIsolateClass?: (classId: number | null) => void;
}

export const DynamicWorldLegend: React.FC<DynamicWorldLegendProps> = ({
  mode,
  classDefs,
  samplingMeters,
  hoveredClass,
  isolatedClass,
  onHoverClass,
  onIsolateClass,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);

  const getTitle = () => {
    if (mode === 'change') return 'Binary Change Classes';
    if (mode === 'transition') return 'Transition Trajectory';
    return 'Land Cover Classes';
  };

  return (
    <div className="bg-card/95 dark:bg-card/90 backdrop-blur-md border border-border/80 rounded-2xl shadow-lg p-3.5 w-60 select-none transition-all font-sans">
      {/* Header with Collapse Toggle */}
      <div
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <h4 className="text-[11px] font-bold tracking-tight text-foreground uppercase font-mono">
            {getTitle()}
          </h4>
        </div>
        <button
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title={isCollapsed ? "Expand legend" : "Collapse legend"}
        >
          {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-3 pt-2.5 border-t border-border/60 flex flex-col gap-2 animate-fadeIn">
          {/* Active Isolation Notice */}
          {isolatedClass !== null && isolatedClass !== undefined && (
            <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg text-[10px] font-mono text-primary">
              <span className="truncate">
                Isolated: {classMap[isolatedClass]?.name || isolatedClass}
              </span>
              <button
                type="button"
                onClick={() => onIsolateClass?.(null)}
                className="hover:underline flex items-center gap-0.5 shrink-0 ml-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="h-2.5 w-2.5" /> Reset
              </button>
            </div>
          )}

          {/* Standard Land Cover & Swipe Mode (9 Classes + Nodata) */}
          {(mode === 'landcover' || mode === 'swipe') && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {Object.values(classMap).map((cls) => {
                const isIsolated = isolatedClass === cls.id;
                const isHovered = hoveredClass === cls.id;
                const isDimmed = isolatedClass !== null && !isIsolated;

                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => onIsolateClass?.(isIsolated ? null : cls.id)}
                    onMouseEnter={() => onHoverClass?.(cls.id)}
                    onMouseLeave={() => onHoverClass?.(null)}
                    title={`Click to isolate ${cls.name}`}
                    className={`flex items-center gap-1.5 text-[11px] text-foreground font-mono text-left py-0.5 px-1 rounded transition-all cursor-pointer ${isIsolated
                      ? 'bg-primary/20 ring-1 ring-primary font-bold text-primary'
                      : isHovered
                        ? 'bg-muted/60 font-semibold'
                        : ''
                      } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-xs border border-black/10"
                      style={{ backgroundColor: cls.color }}
                    />
                    <span className="truncate">
                      {cls.name}
                    </span>
                  </button>
                );
              })}

              {/* Nodata (255) indicator */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono py-0.5 px-1">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0 border border-border shadow-xs"
                  style={{
                    backgroundImage: `
                      linear-gradient(45deg, #cadbc9 25%, transparent 25%), 
                      linear-gradient(-45deg, #cadbc9 25%, transparent 25%), 
                      linear-gradient(45deg, transparent 75%, #cadbc9 75%), 
                      linear-gradient(-45deg, transparent 75%, #cadbc9 75%)
                    `,
                    backgroundSize: '6px 6px',
                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                  }}
                  title="Nodata (255) - Transparent"
                />
                <span className="truncate">
                  Nodata
                </span>
              </div>
            </div>
          )}

          {/* Binary Change Mode */}
          {mode === 'change' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 text-xs text-foreground font-mono">
                <span className="w-3.5 h-3.5 rounded-xs shrink-0 border border-border/80 bg-muted/40 shadow-xs" />
                <div className="flex flex-col">
                  <span className="font-semibold">Unchanged (0)</span>
                  <span className="text-[10px] text-muted-foreground">Stable land cover state</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-foreground font-mono">
                <span
                  className="w-3.5 h-3.5 rounded-xs shrink-0 shadow-xs"
                  style={{ backgroundColor: CHANGE_CLASSES.CHANGED.color }}
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-[#FF0000]">Changed (1)</span>
                  <span className="text-[10px] text-muted-foreground">Multi-class transition detected</span>
                </div>
              </div>

              <div className="text-[10px] text-muted-foreground font-mono mt-1 pt-1 border-t border-border/50">
                Sampling: {samplingMeters ? `~${samplingMeters}m Grid` : 'N/A'}
              </div>
            </div>
          )}

          {/* Class Transition Mode */}
          {mode === 'transition' && (
            <div className="flex flex-col gap-2 text-xs">
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50 text-[11px] font-mono text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground">Change Highlight:</span>
                <div className="mt-0.5 text-primary">
                  Red: Urban expansion · Amber: Tree loss · Blue: Water shift
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                <Info className="h-3 w-3 text-primary shrink-0" />
                <span>See bottom matrix for full transitions.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
