export interface HealthResponse {
  status: string;
  inference_enabled?: boolean;
  model_loaded?: boolean;
  device?: string;
  version?: string;
}

export interface SinglePredictionResponse {
  predicted_class: string;
  confidence: number;
  inference_time: number;
  status: string;
  model_version?: string;
  probabilities?: Record<string, number>;
}

export interface WGS84Bounds {
  min_lon: number;
  min_lat: number;
  max_lon: number;
  max_lat: number;
}

export interface TileClassificationResponse {
  status: string;
  output_geotiff: string;
  width: number;
  height: number;
  crs: string;
  wgs84_bounds: WGS84Bounds;
  total_patches_processed: number;
  dominant_class: string;
  mean_confidence_pct: number;
  total_processing_time_sec: number;
}

export interface ChangeDetectionResponse {
  status: string;
  output_geotiff: string;
  output_csv: string;
  total_pixels: number;
  changed_pixels: number;
  unchanged_pixels: number;
  change_percentage: number;
}

export interface AreaStatRow {
  class_index: number;
  class_name: string;
  year1_pixels?: number;
  year2_pixels?: number;
  year1_area_ha?: number;
  year2_area_ha?: number;
  year1_area_km2: number;
  year2_area_km2: number;
  net_change_ha?: number;
  net_change_km2?: number;
  pct_change: number;
}

export interface LayerMetadata {
  year: number;
  png_url: string | null;
  tif_exists: boolean;
  label: string;
  bounds: [[number, number], [number, number]];
}

export interface DiffMapMetadata {
  period: string;
  png_url: string | null;
}

export interface AvailableLayersResponse {
  status: string;
  city: string;
  coordinates: { lat: number; lon: number };
  layers: LayerMetadata[];
  diff_maps: DiffMapMetadata[];
}

export interface TrendDataPoint {
  year: number;
  Urban: number;
  Vegetation: number;
  Water: number;
  Agriculture: number;
}

export interface DemoDataResponse {
  city: string;
  region: string;
  years: number[];
  kpis: {
    total_area_analyzed_km2: number;
    urban_growth_km2: number;
    urban_growth_pct: number;
    vegetation_loss_km2: number;
    vegetation_loss_pct: number;
    water_loss_km2: number;
    water_loss_pct: number;
    model_accuracy: number;
    water_iou: number;
  };
  class_colors: Record<string, string>;
  trends: TrendDataPoint[];
}

export interface EsriClassItem {
  class_id: number;
  name: string;
  color: string;
}

export interface EsriLocationMetadata {
  id: string;
  name: string;
  level: 'region' | 'state' | 'district' | 'city';
  parent?: string;
  tile: string;
  crs: string;
  bbox: [number, number, number, number];
  center: [number, number];
  available_years: number[];
  description?: string;
}

export interface EsriHierarchyResponse {
  dataset: string;
  resolution_meters: number;
  years: number[];
  classes: EsriClassItem[];
  regions: EsriLocationMetadata[];
  states: EsriLocationMetadata[];
  districts: EsriLocationMetadata[];
  cities: EsriLocationMetadata[];
}

export interface EsriClassAreaStat {
  class_id: number;
  class_name: string;
  color: string;
  pixel_count: number;
  area_km2: number;
  percentage: number;
}

export interface EsriYearStatsResponse {
  location_id: string;
  level: string;
  year: number;
  tile_used: string;
  total_area_km2: number;
  classes: EsriClassAreaStat[];
}

export interface EsriChangeClassDiff {
  class_id: number;
  class_name: string;
  from_area_km2: number;
  to_area_km2: number;
  net_change_km2: number;
  pct_change: number;
}

export interface EsriChangeStatsResponse {
  location_id: string;
  level: string;
  from_year: number;
  to_year: number;
  total_area_km2: number;
  changed_pixels: number;
  change_percentage: number;
  class_diffs: EsriChangeClassDiff[];
}

export interface EsriVisualResourceResponse {
  title: string;
  resource_type: string;
  file_url: string;
  file_size_mb: number;
  years_covered: number[];
  spatial_coverage: string;
  description: string;
}

