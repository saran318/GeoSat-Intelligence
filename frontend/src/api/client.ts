import axios from 'axios';
import type {
  HealthResponse,
  SinglePredictionResponse,
  TileClassificationResponse,
  ChangeDetectionResponse,
  AreaStatRow,
  AvailableLayersResponse,
  DemoDataResponse,
  EsriHierarchyResponse,
  EsriYearStatsResponse,
  EsriChangeStatsResponse,
  EsriVisualResourceResponse,
} from './types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

export const checkHealth = async (): Promise<HealthResponse> => {
  try {
    const res = await api.get<HealthResponse>('/health', { timeout: 8000 });
    return res.data;
  } catch {
    return {
      status: 'offline',
      inference_enabled: false,
    };
  }
};

export const fetchAvailableCities = async (): Promise<string[]> => {
  const res = await api.get<{ status: string; cities: string[] }>('/cities/available');
  return res.data.cities;
};

export const fetchDemoData = async (city: string = 'Bengaluru'): Promise<DemoDataResponse> => {
  const res = await api.get<DemoDataResponse>(`/demo-data?city=${encodeURIComponent(city)}`);
  return res.data;
};

export const fetchAreaStats = async (city: string = 'Bengaluru'): Promise<AreaStatRow[]> => {
  const res = await api.get<{ status: string; data: AreaStatRow[] }>(`/stats/summary?city=${encodeURIComponent(city)}`);
  return res.data.data;
};

export const fetchAvailableLayers = async (city: string = 'Bengaluru'): Promise<AvailableLayersResponse> => {
  const res = await api.get<AvailableLayersResponse>(`/layers/available?city=${encodeURIComponent(city)}`);
  return res.data;
};

export const predictPatch = async (file: File, timeoutMs: number = 25000): Promise<SinglePredictionResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<SinglePredictionResponse>('/predict', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: timeoutMs,
  });
  return res.data;
};

export const classifyTile = async (imageDir: string): Promise<TileClassificationResponse> => {
  const formData = new FormData();
  formData.append('image_dir', imageDir);
  const res = await api.post<TileClassificationResponse>('/classify-tile', formData);
  return res.data;
};

export const runChangeDetection = async (raster1: string, raster2: string): Promise<ChangeDetectionResponse> => {
  const formData = new FormData();
  formData.append('raster_year1', raster1);
  formData.append('raster_year2', raster2);
  const res = await api.post<ChangeDetectionResponse>('/change-detection', formData);
  return res.data;
};

// ── ESRI LAND COVER (2019-2025) API ──
export const fetchEsriHierarchy = async (): Promise<EsriHierarchyResponse> => {
  const res = await api.get<EsriHierarchyResponse>('/esri/hierarchy');
  return res.data;
};

export const fetchEsriStats = async (
  level: string,
  locationId: string,
  year: number
): Promise<EsriYearStatsResponse> => {
  const res = await api.get<EsriYearStatsResponse>(`/esri/stats/${level}/${encodeURIComponent(locationId)}/${year}`);
  return res.data;
};

export const fetchEsriChange = async (
  level: string,
  locationId: string,
  fromYear: number = 2019,
  toYear: number = 2025
): Promise<EsriChangeStatsResponse> => {
  const res = await api.get<EsriChangeStatsResponse>(
    `/esri/change/${level}/${encodeURIComponent(locationId)}?from_year=${fromYear}&to_year=${toYear}`
  );
  return res.data;
};

export const fetchEsriVisualResource = async (): Promise<EsriVisualResourceResponse> => {
  const res = await api.get<EsriVisualResourceResponse>('/esri/visual-resource');
  return res.data;
};

