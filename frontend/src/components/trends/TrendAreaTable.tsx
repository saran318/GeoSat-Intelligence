import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { DynamicWorldChangeStats, DynamicWorldClassDef } from '@/api/dynamicWorldTypes';
import { buildClassMap } from '@/config/dynamicWorldClasses';
import { SectionSkeleton, SectionEmpty, SectionError } from '@/components/shared/AsyncStates';

interface TrendAreaTableProps {
  region: string;
  changeStats: DynamicWorldChangeStats | null;
  classDefs: DynamicWorldClassDef[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrendAreaTable: React.FC<TrendAreaTableProps> = ({
  region,
  changeStats,
  classDefs,
  loading,
  error,
  onRetry,
}) => {
  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);
  const colorByName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of Object.values(classMap)) m[c.name] = c.color;
    return m;
  }, [classMap]);

  const rows = useMemo(() => {
    if (!changeStats?.classes) return [];
    const totalFromPx = Object.values(changeStats.classes).reduce((s, c) => s + (c.count_from || 0), 0) || changeStats.valid_pixels || 1;
    const totalToPx = Object.values(changeStats.classes).reduce((s, c) => s + (c.count_to || 0), 0) || changeStats.valid_pixels || 1;

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
        return {
          name,
          color: colorByName[name] || '#999999',
          fromKm2,
          toKm2,
          deltaKm2,
          fromPct,
          toPct,
          deltaPp,
          pctChange,
        };
      })
      .sort((a, b) => Math.abs(b.deltaKm2) - Math.abs(a.deltaKm2));
  }, [changeStats, colorByName]);

  const totals = useMemo(() => {
    const fromKm2 = rows.reduce((s, r) => s + r.fromKm2, 0);
    const toKm2 = rows.reduce((s, r) => s + r.toKm2, 0);
    const fromPct = rows.reduce((s, r) => s + r.fromPct, 0);
    const toPct = rows.reduce((s, r) => s + r.toPct, 0);
    return {
      fromKm2,
      toKm2,
      deltaKm2: toKm2 - fromKm2,
      fromPct,
      toPct,
      deltaPp: toPct - fromPct,
    };
  }, [rows]);

  const handleExportCsv = () => {
    if (!changeStats || rows.length === 0) return;
    const headers = [
      'Class',
      `${changeStats.from_year} (km2)`,
      `${changeStats.to_year} (km2)`,
      'Delta (km2)',
      `${changeStats.from_year} (%)`,
      `${changeStats.to_year} (%)`,
      'Delta (pp)',
      '% Change',
    ];
    const csvRows = rows.map((r) => [
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
    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeRegion = region.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    a.download = `${safeRegion}_${changeStats.from_year}_${changeStats.to_year}_change_analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            Area Breakdown
          </div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            Land-Cover Change Table ({changeStats ? `${changeStats.from_year}–${changeStats.to_year}` : '—'})
          </h2>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={loading || !!error || rows.length === 0}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/60 hover:bg-muted disabled:opacity-50 text-foreground border border-border text-xs font-mono font-semibold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="h-3.5 w-3.5 text-primary" />
          <span>Export CSV</span>
        </button>
      </div>

      {loading ? (
        <SectionSkeleton rows={6} heightClass="h-9" />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : rows.length === 0 ? (
        <SectionEmpty message={`No land-cover area rows available for ${region}.`} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-mono">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase border-b border-border/60">
                <th className="py-2.5 font-semibold">Class</th>
                <th className="py-2.5 text-right font-semibold">{changeStats?.from_year} km²</th>
                <th className="py-2.5 text-right font-semibold">{changeStats?.to_year} km²</th>
                <th className="py-2.5 text-right font-semibold">Δ km²</th>
                <th className="py-2.5 text-right font-semibold">Δ pp</th>
                <th className="py-2.5 text-right font-semibold">% change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((r) => {
                const arrow = r.deltaKm2 > 0.005 ? '↑ ' : r.deltaKm2 < -0.005 ? '↓ ' : '';
                return (
                  <tr key={r.name} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 flex items-center gap-2 text-foreground font-medium">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                        style={{ backgroundColor: r.color }}
                      />
                      <span>{r.name}</span>
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {r.fromKm2.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {r.toKm2.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-foreground">
                      {arrow}{r.deltaKm2 > 0 ? `+${r.deltaKm2.toFixed(2)}` : r.deltaKm2.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-foreground">
                      {arrow}{r.deltaPp > 0 ? `+${r.deltaPp.toFixed(2)}` : r.deltaPp.toFixed(2)} pp
                    </td>
                    <td className="py-2.5 text-right text-muted-foreground">
                      {r.pctChange !== null
                        ? `${r.pctChange > 0 ? '+' : ''}${r.pctChange.toFixed(1)}%`
                        : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold text-foreground bg-muted/20">
                <td className="py-2.5">Total ({totals.toPct.toFixed(0)}% valid extent)</td>
                <td className="py-2.5 text-right">{totals.fromKm2.toFixed(2)}</td>
                <td className="py-2.5 text-right">{totals.toKm2.toFixed(2)}</td>
                <td className="py-2.5 text-right">
                  {totals.deltaKm2 >= 0 ? `+${totals.deltaKm2.toFixed(2)}` : totals.deltaKm2.toFixed(2)}
                </td>
                <td className="py-2.5 text-right">
                  {totals.deltaPp >= 0 ? `+${totals.deltaPp.toFixed(2)}` : totals.deltaPp.toFixed(2)} pp
                </td>
                <td className="py-2.5 text-right text-muted-foreground">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
};
