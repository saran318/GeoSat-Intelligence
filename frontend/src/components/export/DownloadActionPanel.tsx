import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Map as MapIcon, Database, CheckCircle2, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import type { DynamicWorldChangeStats, DynamicWorldClassDef } from '@/api/dynamicWorldTypes';
import { buildPdfReportBlob } from '@/utils/pdfReport';

interface DownloadActionPanelProps {
  region: string;
  fromYear: number;
  toYear: number;
  changeStats: DynamicWorldChangeStats | null;
  classDefs?: DynamicWorldClassDef[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

type ActionState = 'idle' | 'running' | 'success' | 'error';

export const DownloadActionPanel: React.FC<DownloadActionPanelProps> = ({
  region,
  fromYear,
  toYear,
  changeStats,
  loading = false,
  error = null,
  onRetry,
}) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [pdfState, setPdfState] = useState<ActionState>('idle');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [csvState, setCsvState] = useState<ActionState>('idle');
  const [csvError, setCsvError] = useState<string | null>(null);

  const safeRegion = region.toLowerCase().replace(/[^a-z0-9]+/g, '_');

  const tableRows = useMemo(() => {
    if (!changeStats?.classes) return [];
    const totalFromPx =
      Object.values(changeStats.classes).reduce((s, c) => s + (c.count_from || 0), 0) ||
      changeStats.valid_pixels ||
      1;
    const totalToPx =
      Object.values(changeStats.classes).reduce((s, c) => s + (c.count_to || 0), 0) ||
      changeStats.valid_pixels ||
      1;

    return Object.entries(changeStats.classes)
      .filter(([, item]) => (item.count_from || 0) > 0 || (item.count_to || 0) > 0)
      .map(([name, item]) => {
        const fromKm2 = item.from_area_km2 ?? 0;
        const toKm2 = item.to_area_km2 ?? 0;
        const deltaKm2 = item.net_change_km2 ?? (toKm2 - fromKm2);
        const fromPct = (item.count_from / totalFromPx) * 100;
        const toPct = (item.count_to / totalToPx) * 100;
        const deltaPp = toPct - fromPct;
        const pctChange = fromKm2 > 0 ? ((toKm2 - fromKm2) / fromKm2) * 100 : null;
        return { name, fromKm2, toKm2, deltaKm2, fromPct, toPct, deltaPp, pctChange };
      })
      .sort((a, b) => Math.abs(b.deltaKm2) - Math.abs(a.deltaKm2));
  }, [changeStats]);

  const totals = useMemo(() => {
    const fromKm2 = tableRows.reduce((s, r) => s + r.fromKm2, 0);
    const toKm2 = tableRows.reduce((s, r) => s + r.toKm2, 0);
    const fromPct = tableRows.reduce((s, r) => s + r.fromPct, 0);
    const toPct = tableRows.reduce((s, r) => s + r.toPct, 0);
    return {
      fromKm2,
      toKm2,
      deltaKm2: toKm2 - fromKm2,
      fromPct,
      toPct,
      deltaPp: toPct - fromPct,
    };
  }, [tableRows]);

  const handleCsvDownload = () => {
    if (!changeStats || tableRows.length === 0) {
      setCsvState('error');
      setCsvError('No table data loaded to export.');
      return;
    }
    setCsvState('running');
    setCsvError(null);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const attribution = `# Source: Esri 10m Land Cover (Sentinel-2) | Region: ${region} | Period: ${fromYear}-${toYear} | Generated: ${dateStr}`;
      const headers = [
        'Class',
        `${fromYear} (km2)`,
        `${toYear} (km2)`,
        'Delta (km2)',
        `${fromYear} (%)`,
        `${toYear} (%)`,
        'Delta (pp)',
        '% Change',
      ];
      const csvRows = tableRows.map((r) => [
        `"${r.name}"`,
        r.fromKm2.toFixed(2),
        r.toKm2.toFixed(2),
        r.deltaKm2.toFixed(2),
        r.fromPct.toFixed(2),
        r.toPct.toFixed(2),
        r.deltaPp.toFixed(2),
        r.pctChange !== null ? r.pctChange.toFixed(2) : 'N/A',
      ]);
      csvRows.push([
        '"Total"',
        totals.fromKm2.toFixed(2),
        totals.toKm2.toFixed(2),
        totals.deltaKm2.toFixed(2),
        totals.fromPct.toFixed(2),
        totals.toPct.toFixed(2),
        totals.deltaPp.toFixed(2),
        'N/A',
      ]);

      const content = [attribution, headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geosat_${safeRegion}_${fromYear}-${toYear}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setCsvState('success');
    } catch (err: any) {
      setCsvState('error');
      setCsvError(err?.message || 'Failed to generate CSV.');
    }
  };

  const handlePdfDownload = () => {
    if (!changeStats || tableRows.length === 0) {
      setPdfState('error');
      setPdfError('No change statistics loaded to compile PDF.');
      return;
    }
    setPdfState('running');
    setPdfError(null);
    try {
      const topGain = tableRows.filter((r) => r.deltaKm2 > 0).sort((a, b) => b.deltaKm2 - a.deltaKm2)[0];
      const headline =
        `Between ${fromYear} and ${toYear}, ${changeStats.changed_percentage.toFixed(1)}% ` +
        `(${(changeStats.changed_area_km2 ?? 0).toFixed(2)} km2) of ${region} changed land cover` +
        (topGain ? `, led by ${topGain.name} (+${topGain.deltaKm2.toFixed(2)} km2).` : '.');

      const blob = buildPdfReportBlob({
        region,
        fromYear,
        toYear,
        headline,
        rows: tableRows,
        totals,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geosat_${safeRegion}_${fromYear}-${toYear}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setPdfState('success');
    } catch (err: any) {
      setPdfState('error');
      setPdfError(err?.message || 'Failed to generate PDF report.');
    }
  };

  const isDataDisabled = loading || !!error || tableRows.length === 0;

  return (
    <div className="panel-surface p-6 rounded-2xl flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium uppercase text-primary bg-muted px-2 py-0.5 rounded">
              Deliverables & Exports
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {region || '—'} · {fromYear}–{toYear}
            </span>
          </div>
          <h2 className="text-base font-bold text-foreground tracking-tight mt-1">
            Export Land-Cover Reports & Datasets
          </h2>
        </div>

        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/30 text-xs font-mono font-semibold cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Load</span>
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        onMouseLeave={() => setHoveredCard(null)}
      >
        {/* PDF Report */}
        <div
          className="relative p-5 rounded-xl border border-transparent flex flex-col justify-between transition-all"
          onMouseEnter={() => setHoveredCard('pdf')}
        >
          {hoveredCard === 'pdf' && (
            <motion.div
              layoutId="download-card-hover"
              className="absolute inset-0 bg-muted/40 rounded-xl z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
            />
          )}
          <div className="relative z-10">
            <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-3 shadow-xs">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              PDF Executive Report
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Client-generated PDF with {region} ({fromYear}–{toYear}) headline, real area table, and Esri attribution.
            </p>
          </div>

          <div className="relative z-10 mt-5 space-y-2">
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={isDataDisabled || pdfState === 'running'}
              className="w-full py-2.5 rounded-lg bg-primary hover:opacity-90 disabled:opacity-50 active:scale-[0.98] text-primary-foreground font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              {pdfState === 'running' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{pdfState === 'running' ? 'Compiling PDF...' : 'Download PDF Report'}</span>
            </button>
            {pdfState === 'success' && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>PDF downloaded</span>
              </div>
            )}
            {pdfState === 'error' && (
              <div className="flex items-center justify-between gap-2 text-xs text-destructive font-mono">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {pdfError}
                </span>
                <button type="button" onClick={handlePdfDownload} className="underline cursor-pointer">
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CSV Area Stats */}
        <div
          className="relative p-5 rounded-xl border border-transparent flex flex-col justify-between transition-all"
          onMouseEnter={() => setHoveredCard('csv')}
        >
          {hoveredCard === 'csv' && (
            <motion.div
              layoutId="download-card-hover"
              className="absolute inset-0 bg-muted/40 rounded-xl z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
            />
          )}
          <div className="relative z-10">
            <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-3 shadow-xs">
              <Database className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Tabular Statistics (CSV)
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Exports land-cover class areas (km², Δ pp, % change) to{' '}
              <code className="text-foreground">geosat_{safeRegion}_{fromYear}-{toYear}.csv</code>.
            </p>
          </div>

          <div className="relative z-10 mt-5 space-y-2">
            <button
              type="button"
              onClick={handleCsvDownload}
              disabled={isDataDisabled || csvState === 'running'}
              className="w-full py-2.5 rounded-lg bg-card hover:bg-muted/50 disabled:opacity-50 active:scale-[0.98] text-foreground font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-border/60 shadow-xs"
            >
              {csvState === 'running' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Download className="h-3.5 w-3.5 text-primary" />
              )}
              <span>{csvState === 'running' ? 'Exporting CSV...' : 'Download CSV Dataset'}</span>
            </button>
            {csvState === 'success' && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-mono">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>CSV downloaded</span>
              </div>
            )}
            {csvState === 'error' && (
              <div className="flex items-center justify-between gap-2 text-xs text-destructive font-mono">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {csvError}
                </span>
                <button type="button" onClick={handleCsvDownload} className="underline cursor-pointer">
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* GeoTIFF Rasters */}
        <div
          className="relative p-5 rounded-xl border border-transparent flex flex-col justify-between transition-all"
          onMouseEnter={() => setHoveredCard('geotiff')}
        >
          {hoveredCard === 'geotiff' && (
            <motion.div
              layoutId="download-card-hover"
              className="absolute inset-0 bg-muted/40 rounded-xl z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.15 } }}
              exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
            />
          )}
          <div className="relative z-10">
            <div className="h-9 w-9 rounded-lg bg-card border border-border flex items-center justify-center text-primary mb-3 shadow-xs">
              <MapIcon className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              GIS GeoTIFF Rasters
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              District-masked GeoTIFF export for a chosen year requires a dedicated backend clipped-raster endpoint (existing /raster serves the full UTM tile).
            </p>
          </div>

          <button
            type="button"
            disabled
            className="relative z-10 mt-5 w-full py-2.5 rounded-lg bg-muted text-muted-foreground font-medium text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-border/60"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Not available yet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
