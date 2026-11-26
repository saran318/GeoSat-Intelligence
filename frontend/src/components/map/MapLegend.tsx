import React from 'react';
import { Info } from 'lucide-react';
import { DYNAMIC_WORLD_CLASSES } from '@/config/dynamicWorldClasses';

export const MapLegend: React.FC = () => {
  const classes = Object.values(DYNAMIC_WORLD_CLASSES);

  return (
    <div className="panel-surface p-5 rounded-2xl flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            Land Cover Classes
          </h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground">GeoSat Taxonomy</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
        {classes.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2.5 p-1 text-left"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-black/10"
              style={{ backgroundColor: c.color }}
            />
            <span className="text-xs font-semibold text-foreground leading-tight">
              {c.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
