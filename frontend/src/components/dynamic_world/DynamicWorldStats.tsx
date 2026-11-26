import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { 
  DynamicWorldClassDef,
  DynamicWorldClassData,
  DynamicWorldLayer, 
  DynamicWorldMetadata,
  DynamicWorldClassStats, 
  DynamicWorldChangeStats, 
  DynamicWorldTransitionMatrix 
} from '@/api/dynamicWorldTypes';
import { buildClassMap } from '@/config/dynamicWorldClasses';

interface DynamicWorldStatsProps {
  city: string;
  layer: DynamicWorldLayer;
  classDefs?: DynamicWorldClassDef[];
  metadata?: DynamicWorldMetadata | null;
  stats2019: DynamicWorldClassStats | null;
  stats2023: DynamicWorldClassStats | null;
  changeStats: DynamicWorldChangeStats | null;
  transitionMatrix: DynamicWorldTransitionMatrix | null;
  loading: boolean;
  hoveredClass?: number | null;
  isolatedClass?: number | null;
  onHoverClass?: (classId: number | null) => void;
  onIsolateClass?: (classId: number | null) => void;
}

const findClassEntry = (
  stats: DynamicWorldClassStats | null,
  classId: number,
  className: string
): DynamicWorldClassData => {
  if (!stats?.classes) return { id: classId, pixels: 0, area_km2: 0, percentage: 0 };
  if (stats.classes[className]) return stats.classes[className];
  const byId = Object.values(stats.classes).find((c) => c.id === classId);
  return byId || { id: classId, pixels: 0, area_km2: 0, percentage: 0 };
};

export const DynamicWorldStats: React.FC<DynamicWorldStatsProps> = ({
  city,
  layer,
  classDefs,
  metadata,
  stats2019,
  stats2023,
  changeStats,
  transitionMatrix,
  loading,
  hoveredClass,
  isolatedClass,
  onHoverClass,
  onIsolateClass,
}) => {
  const isBinaryChange = layer.type === 'change';
  const isTransition = layer.type === 'transition';
  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);
  const samplingMeters = stats2019?.sampling_meters ?? changeStats?.sampling_meters ?? metadata?.resolution?.[0];

  // Merged Class Distribution Table States (Item 2, Item 4, Item 7)
  const [landOnly, setLandOnly] = useState<boolean>(false);
  const [showZeroClasses, setShowZeroClasses] = useState<boolean>(false);

  // Loading skeleton while data loads (Item 8)
  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs w-full animate-pulse font-sans">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="h-5 bg-muted rounded w-48" />
          <div className="h-4 bg-muted rounded w-28" />
        </div>
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-xs bg-muted" />
                <div className="h-3.5 bg-muted rounded w-24" />
              </div>
              <div className="flex gap-8">
                <div className="h-3 bg-muted rounded w-12" />
                <div className="h-3 bg-muted rounded w-12" />
                <div className="h-3 bg-muted rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderMergedDistributionCard = () => {
    const fromYear = stats2019?.year ?? layer.year ?? layer.from_year ?? '—';
    const toYear = stats2023?.year ?? layer.to_year ?? '—';
    const isSingleYear = fromYear === toYear || !stats2023;

    // Water pixel subtractions for Land Only calculation
    const fromWaterEntry = findClassEntry(stats2019, 1, 'Water');
    const toWaterEntry = findClassEntry(stats2023, 1, 'Water');
    const fromWaterPixels = fromWaterEntry.pixels ?? 0;
    const toWaterPixels = toWaterEntry.pixels ?? 0;
    const fromTotal = stats2019?.valid_pixels ?? 0;
    const toTotal = stats2023?.valid_pixels ?? 0;

    const fromTotalArea = stats2019?.valid_area_km2 ?? 0;
    const fromWaterArea = fromWaterEntry.area_km2 ?? 0;
    const extentKm2 = landOnly ? Math.max(0, fromTotalArea - fromWaterArea) : fromTotalArea;

    const fromDenominator = landOnly ? Math.max(1, fromTotal - fromWaterPixels) : fromTotal;
    const toDenominator = landOnly ? Math.max(1, toTotal - toWaterPixels) : toTotal;

    // Partition classes into present (pixels > 0) vs 0-pixel, matching by classId & name
    const allClassEntries = Object.keys(classMap).map((idStr) => {
      const classId = Number(idStr);
      const classInfo = classMap[classId];
      const fromItem = findClassEntry(stats2019, classId, classInfo.name);
      const toItem = findClassEntry(stats2023, classId, classInfo.name);
      const totalPixels = (fromItem.pixels || 0) + (toItem.pixels || 0);
      return { classId, classInfo, fromItem, toItem, totalPixels };
    });

    const presentClasses = allClassEntries.filter((c) => c.totalPixels > 0);
    const zeroClasses = allClassEntries.filter((c) => c.totalPixels === 0);

    const renderRow = (item: typeof allClassEntries[0]) => {
      const { classId, classInfo, fromItem, toItem } = item;
      const isWater = classInfo.name.toLowerCase() === 'water' || classId === 1;
      const isIsolated = isolatedClass === classId;
      const isHovered = hoveredClass === classId;
      const isDimmed = isolatedClass !== null && !isIsolated;

      let fromPctDisplay = '0.00%';
      let toPctDisplay = '0.00%';
      let deltaDisplay = '0.00%';
      let deltaColor = 'text-muted-foreground';

      if (landOnly && isWater) {
        fromPctDisplay = '—';
        toPctDisplay = '—';
        deltaDisplay = 'Excluded';
        deltaColor = 'text-muted-foreground italic text-[11px]';
      } else {
        const fromPct = fromDenominator > 0 ? (fromItem.pixels / fromDenominator) * 100 : 0;
        const toPct = toDenominator > 0 ? (toItem.pixels / toDenominator) * 100 : 0;
        const diff = toPct - fromPct;
        const isPositive = diff > 0.005;
        const isNegative = diff < -0.005;

        fromPctDisplay = `${fromPct.toFixed(2)}%`;
        toPctDisplay = `${toPct.toFixed(2)}%`;
        deltaDisplay = isPositive ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;
        deltaColor = isPositive 
          ? 'text-emerald-500 font-bold' 
          : isNegative 
            ? 'text-[#ED022A] font-bold' 
            : 'text-muted-foreground font-bold';
      }

      return (
        <tr 
          key={classId} 
          onMouseEnter={() => onHoverClass?.(classId)}
          onMouseLeave={() => onHoverClass?.(null)}
          onClick={() => onIsolateClass?.(isIsolated ? null : classId)}
          className={`transition-colors cursor-pointer ${
            isIsolated
              ? 'bg-primary/15 font-semibold'
              : isHovered
                ? 'bg-muted/60'
                : 'hover:bg-muted/40'
          } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
        >
          <td className="py-2.5 flex items-center gap-2 text-foreground font-medium">
            <span 
              className="w-2.5 h-2.5 rounded-xs shrink-0 shadow-xs border border-black/10" 
              style={{ backgroundColor: classInfo.color }}
            />
            <span className="truncate">{classInfo.name}</span>
            {landOnly && isWater && (
              <span className="text-[10px] text-muted-foreground/80 font-normal">
                (water body)
              </span>
            )}
            {isIsolated && (
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-mono">
                isolated
              </span>
            )}
          </td>
          <td className="py-2.5 text-right text-muted-foreground">
            {fromPctDisplay}
          </td>
          <td className="py-2.5 text-right text-muted-foreground">
            {toPctDisplay}
          </td>
          <td className="py-2.5 text-right pr-2">
            <span className={deltaColor}>
              {deltaDisplay}
            </span>
          </td>
        </tr>
      );
    };

    return (
      <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between transition-all font-sans w-full">
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                ANNUAL LAND COVER COMPARISON
              </span>
              <h3 className="text-base font-bold text-foreground tracking-tight">
                {isSingleYear ? `${fromYear} Class Distribution` : `Class Distribution (${fromYear} → ${toYear})`}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              {/* Land only toggle (Item 4) */}
              <button
                type="button"
                onClick={() => setLandOnly(!landOnly)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                  landOnly
                    ? 'bg-primary/15 border-primary text-primary font-semibold shadow-2xs'
                    : 'bg-muted/40 hover:bg-muted/70 border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Exclude water and NoData from distribution percentages"
              >
                <span className={`w-2 h-2 rounded-full transition-colors ${landOnly ? 'bg-primary' : 'bg-muted-foreground/60'}`} />
                <span>Land only</span>
              </button>

              <div className="text-right font-mono">
                <span className="text-[10px] text-muted-foreground uppercase block">
                  {landOnly ? 'Land Extent' : 'Valid Extent'}
                </span>
                <span className="text-xs font-bold text-foreground">
                  {stats2019?.valid_area_km2 !== undefined
                    ? `${extentKm2.toFixed(2)} km²`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Merged Table with columns: Class, From-year %, To-year %, Δ */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="text-muted-foreground text-[10px] uppercase border-b border-border/40">
                  <th className="py-2.5 font-semibold">Class</th>
                  <th className="py-2.5 text-right font-semibold">{fromYear} %</th>
                  <th className="py-2.5 text-right font-semibold">{toYear} %</th>
                  <th className="py-2.5 text-right font-semibold pr-2">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {presentClasses.map(renderRow)}

                {/* Collapsed row for 0-pixel classes (Item 7) */}
                {zeroClasses.length > 0 && (
                  <>
                    <tr 
                      onClick={() => setShowZeroClasses(!showZeroClasses)}
                      className="bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-muted-foreground select-none"
                    >
                      <td colSpan={4} className="py-2 px-2 text-[11px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-medium text-foreground/70">
                            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showZeroClasses ? 'rotate-180' : ''}`} />
                            Not present in ROI ({zeroClasses.map((c) => c.classInfo.name).join(', ')})
                          </span>
                          <span className="text-[10px] text-muted-foreground/70">
                            0.00 km² · {showZeroClasses ? 'Hide' : 'Show'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {showZeroClasses && zeroClasses.map(renderRow)}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>{city} ROI Extent</span>
          <span>
            {landOnly
              ? 'Terrestrial Land Coverage (Water Excluded)'
              : `${samplingMeters ? `~${samplingMeters}m` : 'N/A'} Spatial Sampling`}
          </span>
        </div>
      </div>
    );
  };

  // Case 1: Binary Change View
  if (isBinaryChange && changeStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full font-sans">
        {/* Card 1: Change Metric Breakdown */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  CHANGE TELEMETRY
                </span>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Binary Change Overview ({changeStats.from_year}–{changeStats.to_year})
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                {samplingMeters ? `~${samplingMeters}m Metric` : 'Area Metric'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex flex-col">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Unchanged Area</span>
                <span className="text-xl font-bold font-mono text-foreground mt-0.5">
                  {changeStats.unchanged_percentage.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-muted-foreground mt-0.5">
                  {(changeStats.unchanged_area_km2 ?? 0).toFixed(2)} km²
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#C4281B]/10 border border-[#C4281B]/30 flex flex-col">
                <span className="text-[10px] font-mono text-[#C4281B] uppercase font-semibold">Changed Area</span>
                <span className="text-xl font-bold font-mono text-[#C4281B] mt-0.5">
                  {changeStats.changed_percentage.toFixed(2)}%
                </span>
                <span className="text-xs font-mono text-[#C4281B]/80 mt-0.5">
                  {(changeStats.changed_area_km2 ?? 0).toFixed(2)} km²
                </span>
              </div>
            </div>

            {/* Total valid */}
            <div className="mt-4 p-3 bg-secondary/30 rounded-xl border border-border/50 flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground">Total Evaluated Area</span>
              <span className="font-bold text-foreground">{(changeStats.valid_area_km2 ?? 0).toFixed(2)} km²</span>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            Binary pixel difference derived from Dynamic World mode composites.
          </div>
        </div>

        {/* Card 2: Net Flux Breakdown by Class */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  CLASS FLUX ANALYSIS
                </span>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Net Gain & Loss by Class ({changeStats.from_year} ↔ {changeStats.to_year})
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase border-b border-border/40">
                    <th className="py-1.5">Class</th>
                    <th className="py-1.5 text-right">Gain (km²)</th>
                    <th className="py-1.5 text-right">Loss (km²)</th>
                    <th className="py-1.5 text-right">Net Change (km²)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {Object.entries(changeStats.classes || {}).map(([className, item]) => {
                    const netKm2 = item.net_change_km2 ?? 0;
                    const gainKm2 = item.gain_km2 ?? 0;
                    const lossKm2 = item.loss_km2 ?? 0;
                    const isPositive = netKm2 > 0.005;
                    const isNeutral = Math.abs(netKm2) <= 0.005;

                    return (
                      <tr key={className} className="hover:bg-muted/40 transition-colors">
                        <td className="py-1.5 text-foreground font-medium">{className}</td>
                        <td className="py-1.5 text-right text-muted-foreground">+{gainKm2.toFixed(2)}</td>
                        <td className="py-1.5 text-right text-muted-foreground">-{lossKm2.toFixed(2)}</td>
                        <td className={`py-1.5 text-right font-bold ${isNeutral ? 'text-muted-foreground' : isPositive ? 'text-primary' : 'text-[#C4281B]'}`}>
                          {isPositive ? `+${netKm2.toFixed(2)}` : netKm2.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            Net change reflects internal transitions and external conversions.
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Class Transition View
  if (isTransition && changeStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full font-sans">
        {/* Card 1: Top Transitions Decoded Table */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  DIRECTIONAL TRAJECTORY
                </span>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Primary Observed Transitions
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-secondary/50 text-foreground px-2.5 py-1 rounded-md">
                Ranked by Area (km²)
              </span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground text-[10px] uppercase border-b border-border/40">
                    <th className="py-2">Transition</th>
                    <th className="py-2 text-right">Area (km²)</th>
                    <th className="py-2 text-right">Share of Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {changeStats.top_transitions.slice(0, 8).map((t, idx) => {
                    const share = changeStats.changed_pixels > 0 
                      ? ((t.count / changeStats.changed_pixels) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2 text-foreground font-semibold flex items-center gap-1.5">
                          <span>{t.from_class}</span>
                          <span className="text-primary font-bold">→</span>
                          <span>{t.to_class}</span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {(t.area_km2 ?? 0).toFixed(2)} km²
                        </td>
                        <td className="py-2 text-right font-bold text-primary">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            Decoded from integer transitions (from_class × 100 + to_class).
          </div>
        </div>

        {/* Card 2: 9x9 Transition Matrix Summary */}
        <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-semibold">
                  CROSS-TABULATION
                </span>
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Transition Matrix ({changeStats?.from_year ?? transitionMatrix?.from_year ?? ''} → {changeStats?.to_year ?? transitionMatrix?.to_year ?? ''})
                </h3>
              </div>
            </div>

            {transitionMatrix ? (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-left border-collapse text-[10px] font-mono">
                  <thead>
                    <tr className="text-muted-foreground uppercase border-b border-border">
                      <th className="p-1 font-bold">From \ To</th>
                      {transitionMatrix.classes.map((c) => (
                        <th key={c} className="p-1 text-center font-bold" title={c}>
                          {c.substring(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {transitionMatrix.classes.map((fromClass, i) => (
                      <tr key={fromClass} className="hover:bg-muted/30">
                        <td className="p-1 font-bold border-r border-border text-foreground" title={fromClass}>
                          {fromClass.substring(0, 3)}
                        </td>
                        {transitionMatrix.matrix[i].map((val, j) => {
                          const isDiagonal = i === j;
                          const hasVal = val > 0;
                          return (
                            <td 
                              key={j} 
                              className={`p-1 text-center ${
                                isDiagonal 
                                  ? 'text-muted-foreground bg-muted/20' 
                                  : hasVal 
                                    ? 'text-primary font-bold bg-secondary/30' 
                                    : 'text-muted-foreground/30'
                              }`}
                            >
                              {hasVal ? (val > 1000 ? `${(val / 1000).toFixed(0)}k` : val) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs font-mono text-muted-foreground">
                Transition matrix loading...
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
            Columns: Destination class ({changeStats?.to_year ?? transitionMatrix?.to_year ?? ''}). Rows: Origin class ({changeStats?.from_year ?? transitionMatrix?.from_year ?? ''}).
          </div>
        </div>
      </div>
    );
  }

  // Case 3 (Default, Landcover or Swipe mode): Merged Class Distribution Table
  return (
    <div className="w-full font-sans">
      {renderMergedDistributionCard()}
    </div>
  );
};
