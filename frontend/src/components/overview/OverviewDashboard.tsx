import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  MapPin,
  RotateCcw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe2,
  BarChart3,
  Map as MapIcon,
  ChevronDown,
  Database,
  Cpu,
  Layers,
  FileText,
} from 'lucide-react';
import {
  getOverviewSummary,
  getDynamicWorldMetadata,
  getDynamicWorldStats,
  getDynamicWorldChangeStats,
} from '@/api/dynamicWorldClient';
import type {
  DynamicWorldMetadata,
  DynamicWorldClassStats,
  DynamicWorldChangeStats,
  OverviewSummaryResponse,
  OverviewTrendPoint,
} from '@/api/dynamicWorldTypes';
import { DynamicWorldMap } from '@/components/dynamic_world/DynamicWorldMap';
import { DYNAMIC_WORLD_CLASSES } from '@/config/dynamicWorldClasses';

export const OVERVIEW_DISTRICT = 'Kanchipuram';

interface OverviewDashboardProps {
  onNavigate: (tab: string, region?: string) => void;
}

const Sparkline: React.FC<{ points: OverviewTrendPoint[]; color: string }> = ({ points, color }) => {
  if (!points || points.length < 2) return null;
  const values = points.map((p) => p.share_pct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const pad = 3;

  const coords = points.map((p, idx) => {
    const x = pad + (idx / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.share_pct - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-8 overflow-visible"
      aria-label="2019 to 2025 trend sparkline"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords.join(' ')}
      />
    </svg>
  );
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({ onNavigate }) => {
  const selectedRegion = OVERVIEW_DISTRICT;

  const [summary, setSummary] = useState<OverviewSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Step 2: Region Interactive Preview & Key Findings state
  const [regionMeta, setRegionMeta] = useState<DynamicWorldMetadata | null>(null);
  const [regionStats19, setRegionStats19] = useState<DynamicWorldClassStats | null>(null);
  const [regionStats25, setRegionStats25] = useState<DynamicWorldClassStats | null>(null);
  const [regionChange, setRegionChange] = useState<DynamicWorldChangeStats | null>(null);
  const [loadingRegion, setLoadingRegion] = useState<boolean>(false);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [aboutOpen, setAboutOpen] = useState<boolean>(false);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const data = await getOverviewSummary();
      setSummary(data);
    } catch (err: any) {
      setSummary(null);
      setSummaryError(err?.message || 'Unable to load statewide Tamil Nadu summary.');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadRegionPreview = useCallback(async (region: string) => {
    if (!region) return;
    setLoadingRegion(true);
    setRegionError(null);
    try {
      const [meta, s19, s25, chg] = await Promise.all([
        getDynamicWorldMetadata(region, 2025),
        getDynamicWorldStats(region, 2019),
        getDynamicWorldStats(region, 2025),
        getDynamicWorldChangeStats(region, 2019, 2025),
      ]);
      setRegionMeta(meta);
      setRegionStats19(s19);
      setRegionStats25(s25);
      setRegionChange(chg);
      setSliderPos(50);
    } catch (err: any) {
      setRegionError(err?.message || `Unable to load preview data for ${region}.`);
    } finally {
      setLoadingRegion(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRegion) {
      loadRegionPreview(selectedRegion);
    }
  }, [selectedRegion, loadRegionPreview]);

  // Auto-generate 3-4 plain-language findings from real region stats
  const keyFindings: string[] = React.useMemo(() => {
    if (!selectedRegion || !regionStats19 || !regionStats25 || !regionChange) return [];
    const bullets: string[] = [];

    const built19 = regionStats19.classes?.['Built Area'];
    const built25 = regionStats25.classes?.['Built Area'];
    if (built19 && built25) {
      const pp = built25.percentage - built19.percentage;
      const km2 = (built25.area_km2 ?? 0) - (built19.area_km2 ?? 0);
      const verb = pp >= 0 ? 'grew' : 'declined';
      bullets.push(
        `Built Area ${verb} ${Math.abs(pp).toFixed(2)} pp (${km2 >= 0 ? '+' : ''}${km2.toFixed(1)} km²) in ${selectedRegion} since 2019, now covering ${built25.percentage.toFixed(1)}% of the region.`
      );
    }

    bullets.push(
      `Overall, ${regionChange.changed_percentage.toFixed(1)}% (${(regionChange.changed_area_km2 ?? 0).toFixed(1)} km²) of land cover changed between ${regionChange.from_year} and ${regionChange.to_year}.`
    );

    const topTrans = regionChange.top_transitions?.[0];
    if (topTrans) {
      bullets.push(
        `Largest shift was ${topTrans.from_class} → ${topTrans.to_class} (${(topTrans.area_km2 ?? 0).toFixed(1)} km²).`
      );
    }

    const sorted25 = Object.entries(regionStats25.classes || {})
      .filter(([, v]) => v.pixels > 0)
      .sort((a, b) => b[1].percentage - a[1].percentage);
    if (sorted25.length > 0) {
      const [domName, domVal] = sorted25[0];
      bullets.push(
        `Dominant land cover in ${regionStats25.year} is ${domName} at ${domVal.percentage.toFixed(1)}% (${(domVal.area_km2 ?? 0).toFixed(1)} km²).`
      );
    }

    return bullets;
  }, [selectedRegion, regionStats19, regionStats25, regionChange]);

  return (
    <div className="max-w-[1280px] mx-auto w-full flex flex-col gap-8 font-sans">
      {/* Top Fixed District Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 rounded-2xl px-5 py-3.5 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <span className="uppercase tracking-wider font-semibold text-foreground">
            Featured District Preview
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-muted/60 text-foreground text-sm font-medium border border-border rounded-xl px-3.5 py-2">
            {OVERVIEW_DISTRICT}
          </span>
        </div>
      </div>

      {/* 1. Hero */}
      <section className="bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 max-w-2xl">
            <img
              src="/logo.svg"
              alt="GeoSat Intelligence logo"
              width={99}
              height={96}
              className="h-20 sm:h-24 w-auto object-contain shrink-0 dark:invert dark:hue-rotate-180"
            />
            <div className="space-y-2.5">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                GeoSat Intelligence
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Land-cover monitoring and change analysis for Tamil Nadu,{' '}
                {summary ? `${summary.first_year}–${summary.last_year}` : '2019–2025'}.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {['Tamil Nadu', summary ? `${summary.first_year}–${summary.last_year}` : '2019–2025', `${summary?.district_count ?? 'N/A'} districts`].map(
                  (badge) => (
                    <span
                      key={badge}
                      className="text-xs font-mono bg-muted/70 text-foreground/90 border border-border/70 px-2.5 py-1 rounded-lg"
                    >
                      {badge}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('dynamic_world', selectedRegion || undefined)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <span>Open in Land Cover</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('trends', selectedRegion || undefined)}
              className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border text-sm font-semibold transition-colors cursor-pointer"
            >
              View Trend Analysis
            </button>
          </div>
        </div>
      </section>

      {/* 2. Statewide Snapshot (4 KPI cards) */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Statewide Snapshot ({summary ? `${summary.first_year}–${summary.last_year}` : 'Tamil Nadu'})
          </h2>
          {summary && (
            <span className="text-xs font-mono text-muted-foreground">
              {summary.total_area_km2.toLocaleString()} km² across {summary.district_count} districts
            </span>
          )}
        </div>

        {loadingSummary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs animate-pulse space-y-3"
              >
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-7 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-8 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : summaryError ? (
          <div className="bg-card border border-destructive/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{summaryError}</span>
            </div>
            <button
              type="button"
              onClick={loadSummary}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <span>Retry</span>
            </button>
          </div>
        ) : !summary || summary.kpis.length === 0 ? (
          <div className="bg-card border border-border/80 rounded-2xl p-6 text-sm text-muted-foreground text-center">
            No statewide snapshot data available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {summary.kpis.map((kpi) => {
              const isUp = kpi.change_pp > 0.05;
              const isDown = kpi.change_pp < -0.05;
              return (
                <div
                  key={kpi.class_name}
                  className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0 border border-black/10"
                        style={{ backgroundColor: kpi.color }}
                      />
                      <span className="text-sm font-semibold text-foreground">
                        {kpi.class_name}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {summary.last_year}
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-bold font-mono text-foreground">
                      {kpi.share_2025_pct.toFixed(1)}%
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground mt-1">
                      {isUp ? (
                        <TrendingUp className="h-3.5 w-3.5 text-foreground" />
                      ) : isDown ? (
                        <TrendingDown className="h-3.5 w-3.5 text-foreground" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-foreground">
                        {kpi.change_pp > 0 ? `+${kpi.change_pp.toFixed(2)}` : kpi.change_pp.toFixed(2)} pp
                      </span>
                      <span>
                        ({kpi.change_km2 > 0 ? `+${kpi.change_km2.toLocaleString()}` : kpi.change_km2.toLocaleString()} km²)
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-border/40">
                    <Sparkline points={kpi.trend} color={kpi.color} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Interactive Preview (Esri Swipe Map + Key Findings) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Real Esri Swipe Map */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Interactive Preview: {selectedRegion || 'Select a region'} (2019 vs 2025)
              </h2>
              <p className="text-xs text-muted-foreground">
                Drag the divider to compare land cover inside the administrative boundary.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dynamic_world', selectedRegion || undefined)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-colors cursor-pointer"
            >
              <span>Open in Land Cover</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="min-h-[500px] lg:min-h-[580px] xl:min-h-[640px] w-full">
            {loadingRegion && !regionMeta ? (
              <div className="w-full h-full rounded-2xl bg-muted/40 animate-pulse flex items-center justify-center text-sm font-mono text-muted-foreground">
                Loading {selectedRegion} boundary and raster...
              </div>
            ) : regionError ? (
              <div className="w-full h-full rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive">{regionError}</p>
                <button
                  type="button"
                  onClick={() => loadRegionPreview(selectedRegion)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-background border border-border cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-primary" />
                  <span>Retry</span>
                </button>
              </div>
            ) : selectedRegion && regionMeta ? (
              <DynamicWorldMap
                city={selectedRegion}
                metadata={regionMeta}
                layerId="dynamic_world_2019"
                isSwipeMode={true}
                swipeLayerId2="dynamic_world_2025"
                swipeFromYear={2019}
                swipeToYear={2025}
                sliderPos={sliderPos}
                onSliderPosChange={setSliderPos}
                onBoundsFit={() => setSliderPos(50)}
              />
            ) : (
              <div className="w-full h-full rounded-2xl bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
                Select a region to preview.
              </div>
            )}
          </div>
        </div>

        {/* Right: Key Findings Card */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-base font-bold text-foreground">Key Findings</h2>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedRegion || '—'}
              </span>
            </div>

            {loadingRegion ? (
              <div className="space-y-3 animate-pulse py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded-xl w-full" />
                ))}
              </div>
            ) : regionError ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-destructive">{regionError}</p>
                <button
                  type="button"
                  onClick={() => loadRegionPreview(selectedRegion)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-muted border border-border cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 text-primary" />
                  <span>Retry</span>
                </button>
              </div>
            ) : keyFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No key findings available for this region.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {keyFindings.map((bullet, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs sm:text-sm text-foreground leading-relaxed"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            )}

            {/* 2025 Land Cover Breakdown to fill space with real Kanchipuram data */}
            {!loadingRegion && !regionError && regionStats25 && (
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-foreground uppercase tracking-wider">
                    {regionStats25.year} Land Cover Mix
                  </span>
                  {regionChange && (
                    <span className="text-muted-foreground">
                      {regionChange.unchanged_percentage.toFixed(1)}% stable
                    </span>
                  )}
                </div>

                {(() => {
                  const colorByName: Record<string, string> = {};
                  for (const c of Object.values(DYNAMIC_WORLD_CLASSES)) colorByName[c.name] = c.color;
                  const present = Object.entries(regionStats25.classes || {})
                    .filter(([, v]) => v.pixels > 0)
                    .sort((a, b) => b[1].percentage - a[1].percentage);

                  return (
                    <>
                      {/* Stacked proportional bar */}
                      <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-muted">
                        {present.map(([name, val]) => (
                          <div
                            key={name}
                            title={`${name}: ${val.percentage.toFixed(1)}%`}
                            style={{
                              width: `${val.percentage}%`,
                              backgroundColor: colorByName[name] || '#999',
                            }}
                          />
                        ))}
                      </div>

                      {/* Compact class list */}
                      <div className="space-y-1.5">
                        {present.map(([name, val]) => (
                          <div
                            key={name}
                            className="flex items-center justify-between text-xs font-mono"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                                style={{ backgroundColor: colorByName[name] || '#999' }}
                              />
                              <span className="text-foreground truncate">{name}</span>
                            </div>
                            <span className="text-muted-foreground shrink-0">
                              <strong className="text-foreground">{val.percentage.toFixed(1)}%</strong> · {(val.area_km2 ?? 0).toFixed(1)} km²
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          {regionStats25?.valid_area_km2 !== undefined && (
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Evaluated Area</span>
              <span className="font-semibold text-foreground">
                {regionStats25.valid_area_km2.toFixed(1)} km²
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 4. Top Movers (Top 5 Built-Area Growth Districts + Top 5 Changed Classes) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bar Chart: 5 Districts with Biggest Built-Area Growth */}
        <div className="lg:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Top Built-Area Growth Districts
              </h2>
              <p className="text-xs text-muted-foreground">
                5 districts with the largest urban share increase (2019–2025). Click to open in Land Cover.
              </p>
            </div>
          </div>

          {loadingSummary ? (
            <div className="space-y-3 animate-pulse py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 bg-muted rounded-xl w-full" />
              ))}
            </div>
          ) : summaryError ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-destructive">{summaryError}</p>
              <button
                type="button"
                onClick={loadSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-muted border border-border cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 text-primary" />
                <span>Retry</span>
              </button>
            </div>
          ) : !summary || summary.top_built_growth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No district growth data available.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(() => {
                const maxGrowth = Math.max(...summary.top_built_growth.map((d) => d.growth_pp), 1);
                return summary.top_built_growth.map((item) => {
                  const pctWidth = Math.max(8, (item.growth_pp / maxGrowth) * 100);
                  return (
                    <button
                      key={item.district}
                      type="button"
                      onClick={() => onNavigate('dynamic_world', item.district)}
                      className="w-full text-left group p-2.5 rounded-xl hover:bg-muted/50 border border-transparent hover:border-border/60 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.district}
                        </span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">+{item.growth_pp.toFixed(2)} pp</strong> (+{item.growth_km2.toFixed(1)} km²)
                        </span>
                      </div>
                      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300 bg-primary"
                          style={{ width: `${pctWidth}%` }}
                        />
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Compact Table: Top 5 Changed Classes Statewide */}
        <div className="lg:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Top 5 Changed Classes (Statewide)
              </h2>
              <p className="text-xs text-muted-foreground">
                Largest net land-cover shifts across Tamil Nadu ({summary ? `${summary.first_year}–${summary.last_year}` : '2019–2025'}).
              </p>
            </div>
          </div>

          {loadingSummary ? (
            <div className="space-y-3 animate-pulse py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 bg-muted rounded-xl w-full" />
              ))}
            </div>
          ) : summaryError ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-destructive">{summaryError}</p>
              <button
                type="button"
                onClick={loadSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-lg bg-muted border border-border cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 text-primary" />
                <span>Retry</span>
              </button>
            </div>
          ) : !summary || summary.top_changed_classes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No class change data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="text-muted-foreground uppercase border-b border-border/50">
                    <th className="py-2 font-semibold">Class</th>
                    <th className="py-2 text-right font-semibold">2019</th>
                    <th className="py-2 text-right font-semibold">2025</th>
                    <th className="py-2 text-right font-semibold">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {summary.top_changed_classes.map((cls) => (
                    <tr
                      key={cls.class_name}
                      onClick={() => onNavigate('dynamic_world', selectedRegion || undefined)}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 flex items-center gap-2 text-foreground font-medium">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                          style={{ backgroundColor: cls.color }}
                        />
                        <span>{cls.class_name}</span>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {cls.share_2019_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">
                        {cls.share_2025_pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {cls.change_pp > 0 ? `+${cls.change_pp.toFixed(2)}` : cls.change_pp.toFixed(2)} pp
                        <span className="text-muted-foreground font-normal ml-1">
                          ({cls.change_km2 > 0 ? `+${cls.change_km2.toLocaleString()}` : cls.change_km2.toLocaleString()} km²)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* 5. What You Can Do (4 Cards) */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-foreground">What You Can Do</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              tab: 'dynamic_world',
              title: 'Land Cover',
              desc: 'Inspect annual land cover, swipe comparisons, and transition matrices by district.',
              icon: Globe2,
              cta: 'Open in Land Cover',
            },
            {
              tab: 'trends',
              title: 'Trend Analysis',
              desc: 'Track multi-year urban expansion and surface water trends across regions.',
              icon: BarChart3,
              cta: 'View Trend Analysis',
            },
            {
              tab: 'dynamic_world',
              title: 'Swipe & Boundary Compare',
              desc: 'Compare 2019 vs 2025 land cover side by side inside district boundaries.',
              icon: MapIcon,
              cta: 'Open in Land Cover',
            },
            {
              tab: 'export',
              title: 'Reports & Exports',
              desc: 'Export regional land cover summaries, charts, and boundary data packages.',
              icon: FileText,
              cta: 'Open Exports',
            },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{tool.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate(tool.tab, tool.tab === 'dynamic_world' ? selectedRegion || undefined : undefined)}
                  className="inline-flex items-center justify-between w-full px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span>{tool.cta}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. How It Works (Short Strip) */}
      <section className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
        <h2 className="text-sm font-bold text-foreground mb-3">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { step: '1. Data', detail: 'Satellite + District Maps', icon: Database },
            { step: '2. Processing', detail: 'Windowed raster reads, district masking', icon: Layers },
            { step: '3. Analysis', detail: 'Change detection, ResNet-50 patch classification', icon: Cpu },
            { step: '4. Output', detail: 'Interactive maps, stats, reports', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3"
              >
                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-foreground">{item.step}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. About the Data and Model (Collapsible) */}
      <section className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setAboutOpen((prev) => !prev)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <span className="text-sm font-bold text-foreground">
            About the Data and Model
          </span>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              aboutOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {aboutOpen && (
          <div className="px-5 pb-5 pt-2 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <h3 className="font-bold text-foreground uppercase font-mono">Data & Raster Coverage</h3>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Source:</strong> Regional Annual Land Use / Land Cover
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">UTM Tiles:</strong>{' '}
                {summary?.system_info?.tiles?.join(' / ') || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Classes:</strong>{' '}
                {summary?.system_info?.esri_classes?.map((c) => c.name).join(', ') || 'N/A'}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-foreground uppercase font-mono">Patch Classification Model</h3>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Architecture:</strong>{' '}
                {summary?.system_info?.model_name || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Input Tensors:</strong>{' '}
                {summary?.system_info?.input_tensor || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Patch Classes ({summary?.system_info?.resnet_num_classes ?? 'N/A'}):</strong>{' '}
                {summary?.system_info?.resnet_classes?.join(', ') || 'N/A'}
              </p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Validation Accuracy:</strong> N/A (not configured in live runtime)
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 8. Footer */}
      <footer className="pt-2 pb-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-muted-foreground">
        <span>GeoSat Intelligence · v{summary?.system_info?.version || 'N/A'}</span>
        <span>See Data &amp; Credits for dataset attributions and licenses</span>
        <span>Last Data Year: {summary?.last_year ?? 'N/A'}</span>
      </footer>
    </div>
  );
};
