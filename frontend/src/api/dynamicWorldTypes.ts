export interface DynamicWorldClassDef {
  id: number;
  name: string;
  color: string;
}

export interface DynamicWorldCity {
  name: string;
  available_years: number[];
  change_periods: string[];
}

export interface DynamicWorldCitiesResponse {
  cities: DynamicWorldCity[];
  classes?: DynamicWorldClassDef[];
}

export interface DynamicWorldYearsResponse {
  city: string;
  years: number[];
}

export interface DynamicWorldLayer {
  id: string;
  type: 'landcover' | 'change' | 'transition';
  year?: number;
  from_year?: number;
  to_year?: number;
}

export interface DynamicWorldLayersResponse {
  city: string;
  layers: DynamicWorldLayer[];
}

export interface DynamicWorldMetadata {
  city: string;
  year: number;
  source: string;
  method: string;
  crs: string;
  width: number;
  height: number;
  resolution: number[];
  bounds: [number, number, number, number]; // [minX, minY, maxX, maxY]
  dtype: string;
  nodata: number;
}

export interface DynamicWorldClassData {
  id: number;
  pixels: number;
  area_km2?: number;
  percentage: number;
}

export interface DynamicWorldClassStats {
  city: string;
  year: number;
  valid_pixels: number;
  valid_area_km2?: number;
  sampling_meters?: number;
  classes: Record<string, DynamicWorldClassData>;
}

export interface DynamicWorldChangeClassStats {
  count_from: number;
  count_to: number;
  from_area_km2?: number;
  to_area_km2?: number;
  gain: number;
  loss: number;
  net_change: number;
  gain_km2?: number;
  loss_km2?: number;
  net_change_km2?: number;
}

export interface DynamicWorldChangeTopTransition {
  from_class: string;
  to_class: string;
  count: number;
  area_km2?: number;
}

export interface DynamicWorldChangeStats {
  city: string;
  from_year: number;
  to_year: number;
  valid_pixels: number;
  valid_area_km2?: number;
  unchanged_pixels: number;
  unchanged_area_km2?: number;
  changed_pixels: number;
  changed_area_km2?: number;
  unchanged_percentage: number;
  changed_percentage: number;
  sampling_meters?: number;
  classes: Record<string, DynamicWorldChangeClassStats>;
  top_transitions: DynamicWorldChangeTopTransition[];
}

export interface DynamicWorldTransitionMatrix {
  from_year: number;
  to_year: number;
  classes: string[];
  matrix: number[][];
}

export interface OverviewTrendPoint {
  year: number;
  share_pct: number;
  area_km2: number;
}

export interface OverviewKpiItem {
  class_name: string;
  color: string;
  share_2025_pct: number;
  area_2025_km2: number;
  share_2019_pct: number;
  area_2019_km2: number;
  change_pp: number;
  change_km2: number;
  trend: OverviewTrendPoint[];
}

export interface OverviewBuiltGrowthItem {
  district: string;
  built_2019_pct: number;
  built_2025_pct: number;
  growth_pp: number;
  growth_km2: number;
}

export interface OverviewChangedClassItem {
  class_name: string;
  color: string;
  share_2019_pct: number;
  share_2025_pct: number;
  change_pp: number;
  change_km2: number;
}

export interface OverviewSystemInfo {
  version: string;
  tiles: string[];
  model_name: string;
  input_tensor: string;
  resnet_num_classes: number;
  resnet_classes: string[];
  esri_classes: DynamicWorldClassDef[];
}

export interface OverviewSummaryResponse {
  district_count: number;
  years: number[];
  first_year: number;
  last_year: number;
  total_area_km2: number;
  kpis: OverviewKpiItem[];
  top_built_growth: OverviewBuiltGrowthItem[];
  top_changed_classes: OverviewChangedClassItem[];
  system_info: OverviewSystemInfo;
}
