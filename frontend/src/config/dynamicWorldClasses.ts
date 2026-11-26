export interface DWClassInfo {
  id: number;
  name: string;
  color: string;
}

// Esri 10m Land Use Land Cover (Sentinel-2) Class Taxonomy
export const DYNAMIC_WORLD_CLASSES: Record<number, DWClassInfo> = {
  1: { id: 1, name: 'Water', color: '#1A5BAB' },
  2: { id: 2, name: 'Trees', color: '#358221' },
  4: { id: 4, name: 'Flooded vegetation', color: '#87D19E' },
  5: { id: 5, name: 'Crops', color: '#FFDB5C' },
  7: { id: 7, name: 'Built Area', color: '#ED022A' },
  8: { id: 8, name: 'Bare ground', color: '#EDE9E4' },
  9: { id: 9, name: 'Snow/Ice', color: '#F2FAFF' },
  10: { id: 10, name: 'Clouds', color: '#C8C8C8' },
  11: { id: 11, name: 'Rangeland', color: '#EECFA8' },
};

export const buildClassMap = (defs?: DWClassInfo[]): Record<number, DWClassInfo> => {
  if (!defs || defs.length === 0) return DYNAMIC_WORLD_CLASSES;
  const map: Record<number, DWClassInfo> = {};
  for (const d of defs) {
    map[d.id] = d;
  }
  return map;
};

export const DW_NODATA_VALUE = 0;
export const DW_TRANSITION_NODATA = 65535;

export const CHANGE_CLASSES = {
  UNCHANGED: { id: 0, name: 'Unchanged', color: '#E0E0E0' },
  CHANGED: { id: 1, name: 'Changed', color: '#ED022A' },
};

export const decodeTransition = (code: number): { from: DWClassInfo | null; to: DWClassInfo | null; label: string } => {
  if (code === DW_TRANSITION_NODATA || code === 0) {
    return { from: null, to: null, label: 'Nodata' };
  }

  const fromId = Math.floor(code / 100);
  const toId = code % 100;

  const fromClass = DYNAMIC_WORLD_CLASSES[fromId] || null;
  const toClass = DYNAMIC_WORLD_CLASSES[toId] || null;

  const label = `${fromClass ? fromClass.name : 'Unknown'} → ${toClass ? toClass.name : 'Unknown'}`;

  return { from: fromClass, to: toClass, label };
};

export const getHexColorForClass = (classId: number): string => {
  if (classId === DW_NODATA_VALUE || classId === DW_TRANSITION_NODATA) {
    return 'transparent';
  }
  return DYNAMIC_WORLD_CLASSES[classId]?.color || 'transparent';
};
