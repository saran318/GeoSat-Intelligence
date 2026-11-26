import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DynamicWorldClassDef, DynamicWorldClassStats } from '@/api/dynamicWorldTypes';
import { buildClassMap } from '@/config/dynamicWorldClasses';
import { SectionSkeleton, SectionEmpty, SectionError } from '@/components/shared/AsyncStates';

interface TrendSeriesChartProps {
  region: string;
  yearlySeries: DynamicWorldClassStats[];
  classDefs: DynamicWorldClassDef[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const TrendSeriesChart: React.FC<TrendSeriesChartProps> = ({
  region,
  yearlySeries,
  classDefs,
  loading,
  error,
  onRetry,
}) => {
  const [unit, setUnit] = useState<'pct' | 'km2'>('pct');
  const [isolatedClass, setIsolatedClass] = useState<string | null>(null);

  const classMap = useMemo(() => buildClassMap(classDefs), [classDefs]);

  // Determine present Esri classes (pixels > 0 in at least one year)
  const presentClasses = useMemo(() => {
    const seen = new Set<string>();
    for (const st of yearlySeries) {
      for (const [name, data] of Object.entries(st.classes || {})) {
        if ((data.pixels || 0) > 0) seen.add(name);
      }
    }
    return Object.values(classMap).filter((c) => seen.has(c.name));
  }, [yearlySeries, classMap]);

  const chartData = useMemo(() => {
    return [...yearlySeries]
      .sort((a, b) => a.year - b.year)
      .map((st) => {
        const row: Record<string, number> = { year: st.year };
        const totalArea = st.valid_area_km2 ?? 0;
        for (const cls of presentClasses) {
          const entry = st.classes?.[cls.name];
          if (unit === 'pct') {
            const pct =
              st.valid_pixels > 0 && entry
                ? (entry.pixels / st.valid_pixels) * 100
                : entry?.percentage ?? 0;
            row[cls.name] = Number(pct.toFixed(2));
          } else {
            const area =
              entry?.area_km2 !== undefined
                ? entry.area_km2
                : totalArea > 0 && entry
                ? (entry.percentage / 100) * totalArea
                : 0;
            row[cls.name] = Number(area.toFixed(2));
          }
        }
        return row;
      });
  }, [yearlySeries, presentClasses, unit]);

  return (
    <section className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            Multi-Year Trend
          </div>
          <h2 className="text-base font-bold text-foreground tracking-tight">
            {region} Land-Cover Composition ({chartData[0]?.year ?? '—'}–{chartData[chartData.length - 1]?.year ?? '—'})
          </h2>
        </div>

        <div className="flex items-center gap-1.5 bg-muted/50 border border-border/80 rounded-xl p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setUnit('pct')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              unit === 'pct'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-foreground/80 hover:bg-muted'
            }`}
          >
            Share (%)
          </button>
          <button
            type="button"
            onClick={() => setUnit('km2')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
              unit === 'km2'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-foreground/80 hover:bg-muted'
            }`}
          >
            Area (km²)
          </button>
        </div>
      </div>

      {loading ? (
        <SectionSkeleton rows={5} heightClass="h-12" />
      ) : error ? (
        <SectionError message={error} onRetry={onRetry} />
      ) : chartData.length === 0 || presentClasses.length === 0 ? (
        <SectionEmpty message={`No yearly trend data available for ${region}.`} />
      ) : (
        <>
          <div className="w-full h-80 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="year"
                  stroke="var(--muted-foreground)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                  unit={unit === 'pct' ? '%' : ''}
                />
                <Tooltip
                  formatter={(value: any) =>
                    unit === 'pct' ? `${Number(value).toFixed(2)}%` : `${Number(value).toFixed(2)} km²`
                  }
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: '10px',
                    color: 'var(--foreground)',
                    fontSize: '12px',
                  }}
                />
                {presentClasses.map((cls) => {
                  const isDimmed = isolatedClass !== null && isolatedClass !== cls.name;
                  return (
                    <Line
                      key={cls.name}
                      type="monotone"
                      dataKey={cls.name}
                      stroke={cls.color}
                      strokeWidth={isolatedClass === cls.name ? 3 : 2}
                      strokeOpacity={isDimmed ? 0.15 : 1}
                      dot={{ r: isDimmed ? 0 : 3 }}
                      activeDot={{ r: 5 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Legend: click to isolate a class */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
            <span className="text-xs font-mono text-muted-foreground mr-1">
              Click to isolate:
            </span>
            {presentClasses.map((cls) => {
              const isSelected = isolatedClass === cls.name;
              const isDimmed = isolatedClass !== null && !isSelected;
              return (
                <button
                  key={cls.name}
                  type="button"
                  onClick={() => setIsolatedClass(isSelected ? null : cls.name)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary/15 border-primary text-foreground font-semibold'
                      : 'bg-muted/40 border-border/70 text-foreground/90 hover:bg-muted'
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0 border border-black/10"
                    style={{ backgroundColor: cls.color }}
                  />
                  <span>{cls.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
};
