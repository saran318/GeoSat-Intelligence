import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Play,
  Pause,
  Maximize2,
  TrendingUp,
  BarChart2,
  Compass,
  Sparkles,
} from 'lucide-react';
import {
  fetchEsriHierarchy,
  fetchEsriStats,
  fetchEsriChange,
  fetchEsriVisualResource
} from '../../api/client';
import type {
  EsriHierarchyResponse,
  EsriLocationMetadata,
  EsriYearStatsResponse,
  EsriChangeStatsResponse,
  EsriVisualResourceResponse
} from '../../api/types';

export const EsriLandCoverDashboard: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<EsriHierarchyResponse | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'region' | 'state' | 'district' | 'city'>('city');
  const [selectedLocation, setSelectedLocation] = useState<string>('Chennai');
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [stats, setStats] = useState<EsriYearStatsResponse | null>(null);
  const [changeStats, setChangeStats] = useState<EsriChangeStatsResponse | null>(null);
  const [visualResource, setVisualResource] = useState<EsriVisualResourceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [isPlayingGif, setIsPlayingGif] = useState<boolean>(true);
  const [expandedGif, setExpandedGif] = useState<boolean>(false);

  // Load initial hierarchy and visual resource metadata
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const [hRes, vRes] = await Promise.all([
          fetchEsriHierarchy().catch(() => null),
          fetchEsriVisualResource().catch(() => null)
        ]);
        if (hRes) setHierarchy(hRes);
        if (vRes) setVisualResource(vRes);
      } catch (err) {
        console.error('Failed to load Esri data:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Update selected location when level changes
  useEffect(() => {
    if (!hierarchy) return;
    const items = getItemsForLevel(selectedLevel);
    if (items.length > 0 && !items.find(i => i.id === selectedLocation)) {
      setSelectedLocation(items[0].id);
    }
  }, [selectedLevel, hierarchy]);

  // Load stats and change detection when location or year changes
  useEffect(() => {
    if (!selectedLocation) return;
    const loadLocationData = async () => {
      try {
        setStatsLoading(true);
        const [sRes, cRes] = await Promise.all([
          fetchEsriStats(selectedLevel, selectedLocation, selectedYear).catch(() => null),
          fetchEsriChange(selectedLevel, selectedLocation, 2019, 2025).catch(() => null)
        ]);
        if (sRes) setStats(sRes);
        if (cRes) setChangeStats(cRes);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setStatsLoading(false);
      }
    };
    loadLocationData();
  }, [selectedLevel, selectedLocation, selectedYear]);

  const getItemsForLevel = (level: 'region' | 'state' | 'district' | 'city'): EsriLocationMetadata[] => {
    if (!hierarchy) return [];
    switch (level) {
      case 'region': return hierarchy.regions;
      case 'state': return hierarchy.states;
      case 'district': return hierarchy.districts;
      case 'city': return hierarchy.cities;
    }
  };

  const currentLocationMeta = getItemsForLevel(selectedLevel).find(i => i.id === selectedLocation);

  const gifSrc = visualResource?.file_url || '/assets/esri_tamil_nadu_2019_2025.gif';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-xs font-mono text-muted-foreground animate-pulse">
        Initializing Regional Esri Sentinel-2 (2019–2025) Intelligence...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-16">
      {/* ── Top Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/40 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Esri 10m Annual LULC Time Series · 2019–2025</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tamil Nadu & South India Regional Intelligence
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Synthesized from high-resolution Sentinel-2 tiles <strong>43P</strong> (Western Ghats) & <strong>44P</strong> (Coromandel Coast). 
              Prepared for multi-level hierarchical monitoring across regions, states, districts, and urban cores.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono">
              <span className="text-slate-400">Resolution:</span>{' '}
              <strong className="text-white">10.0m Ground GSD</strong>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-mono">
              <span className="text-slate-400">Coverage:</span>{' '}
              <strong className="text-emerald-400">7 Full Years (2019–2025)</strong>
            </div>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Main Two-Column Layout: Visual Resource & Hierarchy Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Animated Visual Resource (GIF Showcase) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm tracking-tight text-foreground">
                  Animated Timelapse Visual Resource
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlayingGif(!isPlayingGif)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-border hover:bg-muted font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isPlayingGif ? <Pause className="w-3 h-3 text-amber-500" /> : <Play className="w-3 h-3 text-emerald-500" />}
                  <span>{isPlayingGif ? 'Playing' : 'Paused'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedGif(true)}
                  className="p-1.5 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Expand Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Display Container */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-slate-950 flex items-center justify-center min-h-[360px] group shadow-inner">
              <img
                src={gifSrc}
                alt="Esri Land Cover Timelapse 2019-2025"
                className={`w-full h-auto object-contain transition-opacity duration-300 ${
                  isPlayingGif ? 'opacity-100' : 'opacity-85 filter grayscale-[25%]'
                }`}
              />

              <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg bg-slate-900/85 backdrop-blur-md border border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Sentinel-2 10m LULC Dynamics</span>
                </div>
                <span className="text-primary font-bold">2019 → 2025</span>
              </div>
            </div>

            {/* Resource Description */}
            <div className="mt-4 pt-3 border-t border-border/60 text-xs text-muted-foreground space-y-1.5">
              <p>
                <strong>Tile 44P (Coromandel Coast / Eastern TN):</strong> Synthesized across 7 years to highlight coastal expansion, urban growth around Chennai and Madurai, and agro-forestry shifts.
              </p>
              <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground pt-1">
                <span>Tile: <strong>44P (UTM 44N)</strong></span>
                <span>Band: <strong>10-Class Mode</strong></span>
                <span>Size: <strong>{visualResource?.file_size_mb || '0.11'} MB</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Multi-Scale Hierarchy & Analytics Engine */}
        <div className="lg:col-span-7 space-y-6">
          {/* Controls: Level Tabs, Location Selector, Year Pill */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Hierarchy Level Tabs */}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/80">
                {(['region', 'state', 'district', 'city'] as const).map((level) => {
                  const isActive = selectedLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedLevel(level)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>

              {/* Year Selectors */}
              <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl border border-border/80 text-xs font-mono">
                <Calendar className="w-3.5 h-3.5 ml-2 text-muted-foreground" />
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setSelectedYear(y)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      selectedYear === y
                        ? 'bg-card text-foreground border border-border shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Location Selector Dropdown & Spatial Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Select {selectedLevel.toUpperCase()}:
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-border bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {getItemsForLevel(selectedLevel).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.tile})
                    </option>
                  ))}
                </select>
              </div>

              {currentLocationMeta && (
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Assigned Tile:</span>
                    <strong className="text-foreground">{currentLocationMeta.tile}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CRS:</span>
                    <span className="text-foreground">{currentLocationMeta.crs}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>BBox:</span>
                    <span className="text-foreground text-[10px]">
                      [{currentLocationMeta.bbox.map(n => n.toFixed(2)).join(', ')}]
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
              <span className="text-[11px] font-mono text-muted-foreground">Analyzed Area</span>
              <div className="text-lg font-bold text-foreground mt-0.5">
                {stats?.total_area_km2.toLocaleString() || '...'} <span className="text-xs font-normal">km²</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
              <span className="text-[11px] font-mono text-muted-foreground">Resolution</span>
              <div className="text-lg font-bold text-primary mt-0.5">
                10.0 <span className="text-xs font-normal">m/pixel</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
              <span className="text-[11px] font-mono text-muted-foreground">Net Urban Chg</span>
              <div className="text-lg font-bold text-emerald-500 mt-0.5">
                {changeStats ? (
                  <>
                    +{changeStats.class_diffs.find(d => d.class_name === 'Built Area')?.net_change_km2 || 0}
                    <span className="text-xs font-normal text-muted-foreground"> km²</span>
                  </>
                ) : '...'}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-2xs">
              <span className="text-[11px] font-mono text-muted-foreground">Overall Shift</span>
              <div className="text-lg font-bold text-amber-500 mt-0.5">
                {changeStats?.change_percentage.toFixed(1) || '0.0'}%
              </div>
            </div>
          </div>

          {/* Class Breakdown & Statistics Table */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">
                  Land Cover Distribution ({selectedYear})
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Source: Sentinel-2 / Esri LULC Mode
              </span>
            </div>

            {statsLoading ? (
              <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-mono">
                Computing windowed raster distribution...
              </div>
            ) : (
              <div className="space-y-2.5">
                {stats?.classes
                  .filter(c => c.area_km2 > 0)
                  .map((cls) => (
                    <div key={cls.class_id} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cls.color }}
                          />
                          <span className="font-medium text-foreground">{cls.class_name}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-muted-foreground">
                          <span>{cls.area_km2.toLocaleString()} km²</span>
                          <span className="font-bold text-foreground w-12 text-right">
                            {cls.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, cls.percentage)}%`,
                            backgroundColor: cls.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 2019 → 2025 Multi-Year Transition Matrix Summary */}
          {changeStats && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-sm text-foreground">
                    Multi-Year Net Shift: 2019 → 2025
                  </h3>
                </div>
                <span className="text-xs font-mono text-muted-foreground">
                  7-Year Transition
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border/80 text-muted-foreground">
                      <th className="py-2">Class</th>
                      <th className="py-2 text-right">2019 Area</th>
                      <th className="py-2 text-right">2025 Area</th>
                      <th className="py-2 text-right">Net Change</th>
                      <th className="py-2 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {changeStats.class_diffs
                      .filter(d => Math.abs(d.net_change_km2) > 0.05)
                      .map((diff) => {
                        const isPositive = diff.net_change_km2 > 0;
                        return (
                          <tr key={diff.class_id} className="hover:bg-muted/30">
                            <td className="py-2 font-medium text-foreground">{diff.class_name}</td>
                            <td className="py-2 text-right text-muted-foreground">{diff.from_area_km2.toFixed(1)} km²</td>
                            <td className="py-2 text-right text-foreground">{diff.to_area_km2.toFixed(1)} km²</td>
                            <td className={`py-2 text-right font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPositive ? '+' : ''}{diff.net_change_km2.toFixed(1)} km²
                            </td>
                            <td className={`py-2 text-right ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isPositive ? '+' : ''}{diff.pct_change.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal for Fullscreen GIF inspection ── */}
      <AnimatePresence>
        {expandedGif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
            onClick={() => setExpandedGif(false)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-2">
              <img
                src={gifSrc}
                alt="Fullscreen Timelapse"
                className="w-full h-auto max-h-[80vh] object-contain mx-auto"
              />
              <div className="p-3 text-center text-xs font-mono text-slate-400">
                Click anywhere to close · Esri 10m Land Cover Timelapse (2019–2025)
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default EsriLandCoverDashboard;
