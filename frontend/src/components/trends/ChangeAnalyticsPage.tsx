import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, ArrowUpRight, ArrowDownRight, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { useRegionYearParams } from '@/hooks/useRegionYearParams';
import {
  fetchYearlyStatsSeries,
  fetchChangeAndTransitions,
} from '@/api/analyticsFetchers';
import type {
  DynamicWorldClassStats,
  DynamicWorldChangeStats,
  DynamicWorldTransitionMatrix,
} from '@/api/dynamicWorldTypes';
import { buildClassMap } from '@/config/dynamicWorldClasses';
import { YearRangePills } from '@/components/shared/YearRangePills';
import { RegionSelector } from '@/components/shared/RegionSelector';
import { SectionSkeleton, SectionEmpty, SectionError } from '@/components/shared/AsyncStates';
import { TrendSeriesChart } from './TrendSeriesChart';
import { TrendAreaTable } from './TrendAreaTable';

export const ChangeAnalyticsPage: React.FC = () => {
  const {
    cities,
    classDefs,
    loadingCities,
    citiesError,
    retryCities,
    region,
    setRegion,
    fromYear,
    toYear,
    availableYears,
    setFromYear,
    setToYear,
    swapYears,
  } = useRegionYearParams();

  const [yearlySeries, setYearlySeries] = useState<DynamicWorldClassStats[]>([]);
  const [loadingSeries, setLoadingSeries] = useState<boolean>(false);
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [changeStats, setChangeStats] = useState<DynamicWorldChangeStats | null>(null);
  const [transitions, setTransitions] = useState<DynamicWorldTransitionMatrix | null>(null);
  const [loadingChange, setLoadingChange] = useState<boolean>(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const loadSeries = useCallback(async () => {
    if (!region || availableYears.length === 0) return;
    setLoadingSeries(true);
    setSeriesError(null);
    try {
      const data = await fetchYearlyStatsSeries(region, availableYears);
      setYearlySeries(data);
    } catch (err: any) {
      setYearlySeries([]);
      setSeriesError(err?.message || `Failed to load yearly statistics for ${region}.`);
    } finally {
      setLoadingSeries(false);
    }
  }, [region, availableYears.join(',')]);

  const loadChange = useCallback(async () => {
    if (!region || !fromYear || !toYear || fromYear >= toYear) return;
    setLoadingChange(true);
    setChangeError(null);
    try {
      const res = await fetchChangeAndTransitions(region, fromYear, toYear);
      setChangeStats(res.changeStats);
      setTransitions(res.transitions);
    } catch (err: any) {
      setChangeStats(null);
      setTransitions(null);
      setChangeError(err?.message || `Failed to load change data for ${region}.`);
    } finally {
      setLoadingChange(false);
    }
  }, [region, fromYear, toYear]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    loadChange();
  }, [loadChange]);

  // Compute real class deltas (pp and km2) for KPIs & headline
  const classDeltaMetrics = useMemo(() => {
    if (!changeStats?.classes || !changeStats.valid_area_km2) return [];
    const totalArea = changeStats.valid_area_km2;
    return Object.entries(changeStats.classes).map(([name, item]) => {
      const fromKm2 = item.from_area_km2 ?? 0;
      const toKm2 = item.to_area_km2 ?? 0;
      const deltaKm2 = item.net_change_km2 ?? (toKm2 - fromKm2);
      const fromPct = totalArea > 0 ? (fromKm2 / totalArea) * 100 : 0;
      const toPct = totalArea > 0 ? (toKm2 / totalArea) * 100 : 0;
      const deltaPp = toPct - fromPct;
      return { name, fromKm2, toKm2, deltaKm2, fromPct, toPct, deltaPp };
    });
  }, [changeStats]);

  const biggestGain = useMemo(() => {
    const gains = classDeltaMetrics.filter((c) => c.deltaKm2 > 0).sort((a, b) => b.deltaKm2 - a.deltaKm2);
    return gains[0] || null;
  }, [classDeltaMetrics]);

  const biggestLoss = useMemo(() => {
    const losses = classDeltaMetrics.filter((c) => c.deltaKm2 < 0).sort((a, b) => a.deltaKm2 - b.deltaKm2);
    return losses[0] || null;
  }, [classDeltaMetrics]);

  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);
  const colorByName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of Object.values(classMap)) m[c.name] = c.color;
    return m;
  }, [classMap]);

  const topFiveTransitions = useMemo(() => {
    if (!changeStats?.top_transitions || changeStats.top_transitions.length === 0) return [];
    return changeStats.top_transitions.slice(0, 5);
  }, [changeStats]);

  if (loadingCities && cities.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto w-full bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
        <SectionSkeleton rows={4} heightClass="h-10" />
      </div>
    );
  }

  if (citiesError && cities.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto w-full">
        <SectionError message={citiesError} onRetry={retryCities} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto w-full flex flex-col gap-6 font-sans">
      {/* 1. Header: Region selector + From/To Year Pills with Swap */}
      <header className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            Trend Analysis
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {region || 'Select Region'} ({fromYear}–{toYear})
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <RegionSelector
              regions={cities.map((c) => c.name)}
              value={region}
              onChange={setRegion}
            />
          </div>

          <YearRangePills
            years={availableYears}
            fromYear={fromYear}
            toYear={toYear}
            onFromChange={setFromYear}
            onToChange={setToYear}
            onSwap={swapYears}
          />
        </div>
      </header>

      {/* 2. Headline Sentence + 4 KPI Cards */}
      <section className="flex flex-col gap-4">
        {loadingChange ? (
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
            <SectionSkeleton rows={2} heightClass="h-12" />
          </div>
        ) : changeError ? (
          <SectionError message={changeError} onRetry={loadChange} />
        ) : !changeStats ? (
          <SectionEmpty message={`No change statistics available for ${region} (${fromYear}–${toYear}).`} />
        ) : (
          <>
            <div className="bg-card border border-border/80 rounded-2xl px-5 py-4 shadow-xs text-sm text-foreground leading-relaxed">
              Between <strong>{changeStats.from_year}</strong> and <strong>{changeStats.to_year}</strong>,{' '}
              <strong>{changeStats.changed_percentage.toFixed(1)}%</strong> ({(changeStats.changed_area_km2 ?? 0).toFixed(2)} km²) of{' '}
              <strong>{region}</strong> changed land cover
              {biggestGain
                ? `, with ${biggestGain.name} recording the largest net gain (+${biggestGain.deltaKm2.toFixed(2)} km²).`
                : '.'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: Area Changed */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                  <span>Area Changed</span>
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {(changeStats.changed_area_km2 ?? 0).toFixed(2)} km²
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {changeStats.changed_percentage.toFixed(2)}% of valid extent
                </div>
              </div>

              {/* KPI 2: Biggest Gain */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                  <span>Biggest Gain</span>
                  <ArrowUpRight className="h-4 w-4 text-foreground" />
                </div>
                <div className="text-xl font-bold text-foreground truncate">
                  {biggestGain ? biggestGain.name : 'None'}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {biggestGain
                    ? `+${biggestGain.deltaKm2.toFixed(2)} km² (+${biggestGain.deltaPp.toFixed(2)} pp)`
                    : 'No net class gain'}
                </div>
              </div>

              {/* KPI 3: Biggest Loss */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                  <span>Biggest Loss</span>
                  <ArrowDownRight className="h-4 w-4 text-foreground" />
                </div>
                <div className="text-xl font-bold text-foreground truncate">
                  {biggestLoss ? biggestLoss.name : 'None'}
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {biggestLoss
                    ? `${biggestLoss.deltaKm2.toFixed(2)} km² (${biggestLoss.deltaPp.toFixed(2)} pp)`
                    : 'No net class loss'}
                </div>
              </div>

              {/* KPI 4: Unchanged Area % */}
              <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase">
                  <span>Unchanged Area</span>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {changeStats.unchanged_percentage.toFixed(2)}%
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  {(changeStats.unchanged_area_km2 ?? 0).toFixed(2)} km² stable
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 3. Trend Chart */}
      <TrendSeriesChart
        region={region}
        yearlySeries={yearlySeries}
        classDefs={classDefs}
        loading={loadingSeries}
        error={seriesError}
        onRetry={loadSeries}
      />

      {/* 4. Class Flow: Top 5 "from -> to" transitions in km2 */}
      <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border/60">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
              Class Flow
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Top 5 Land-Cover Transitions ({fromYear} → {toYear})
            </h2>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {transitions ? `${transitions.classes.length}×${transitions.classes.length} matrix verified` : 'Real pixel-wise transitions'}
          </span>
        </div>

        {loadingChange ? (
          <SectionSkeleton rows={5} heightClass="h-10" />
        ) : changeError ? (
          <SectionError message={changeError} onRetry={loadChange} />
        ) : topFiveTransitions.length === 0 ? (
          <SectionEmpty message="Transition data not available yet." />
        ) : (
          <div className="flex flex-col gap-3">
            {(() => {
              const maxArea = Math.max(...topFiveTransitions.map((t) => t.area_km2 ?? 0), 0.01);
              return topFiveTransitions.map((t, idx) => {
                const area = t.area_km2 ?? 0;
                const widthPct = Math.max(6, (area / maxArea) * 100);
                const shareOfChange =
                  changeStats && changeStats.changed_pixels > 0
                    ? ((t.count / changeStats.changed_pixels) * 100).toFixed(1)
                    : '0.0';
                return (
                  <div
                    key={`${t.from_class}-${t.to_class}-${idx}`}
                    className="p-3 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                          style={{ backgroundColor: colorByName[t.from_class] || '#999' }}
                        />
                        <span>{t.from_class}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                          style={{ backgroundColor: colorByName[t.to_class] || '#999' }}
                        />
                        <span>{t.to_class}</span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        <strong className="text-foreground">{area.toFixed(2)} km²</strong> · {shareOfChange}% of changed area
                      </div>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${widthPct}%`,
                          backgroundColor: colorByName[t.to_class] || 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </section>

      {/* 5. Area Table + Export CSV */}
      <TrendAreaTable
        region={region}
        changeStats={changeStats}
        classDefs={classDefs}
        loading={loadingChange}
        error={changeError}
        onRetry={loadChange}
      />

      {/* 6. Finding Card (1-2 sentences from real numbers only) */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold mb-1.5">
          Key Finding
        </div>
        {loadingChange ? (
          <SectionSkeleton rows={1} heightClass="h-8" />
        ) : changeError ? (
          <SectionError message={changeError} onRetry={loadChange} />
        ) : !changeStats ? (
          <SectionEmpty message="No finding available without comparison data." />
        ) : (
          <p className="text-sm text-foreground leading-relaxed">
            In <strong>{region}</strong> ({changeStats.from_year}–{changeStats.to_year}),{' '}
            <strong>{(changeStats.changed_area_km2 ?? 0).toFixed(2)} km²</strong> ({changeStats.changed_percentage.toFixed(1)}%) shifted between land-cover classes while{' '}
            <strong>{changeStats.unchanged_percentage.toFixed(1)}%</strong> remained stable.
            {biggestGain && biggestLoss
              ? ` The largest net expansion was ${biggestGain.name} (+${biggestGain.deltaKm2.toFixed(2)} km²), whereas ${biggestLoss.name} saw the largest net decline (${biggestLoss.deltaKm2.toFixed(2)} km²).`
              : topFiveTransitions[0]
                ? ` The top observed transition was ${topFiveTransitions[0].from_class} → ${topFiveTransitions[0].to_class} (${(topFiveTransitions[0].area_km2 ?? 0).toFixed(2)} km²).`
                : ''}
          </p>
        )}
      </section>
    </div>
  );
};
