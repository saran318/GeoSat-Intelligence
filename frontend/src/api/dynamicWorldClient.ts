import axios from 'axios';
import type {
  DynamicWorldCitiesResponse,
  DynamicWorldYearsResponse,
  DynamicWorldLayersResponse,
  DynamicWorldMetadata,
  DynamicWorldClassStats,
  DynamicWorldChangeStats,
  DynamicWorldTransitionMatrix,
  OverviewSummaryResponse,
} from './dynamicWorldTypes';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Simple in-memory cache so switching tabs doesn't refetch
const responseCache = new Map<string, any>();

async function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (responseCache.has(key)) {
    return responseCache.get(key) as T;
  }
  const data = await fetcher();
  responseCache.set(key, data);
  return data;
}

export const getDynamicWorldCities = async (): Promise<DynamicWorldCitiesResponse> => {
  return cachedGet('cities', async () => {
    const res = await api.get<DynamicWorldCitiesResponse>('/dynamic-world/cities');
    return res.data;
  });
};

export const getOverviewSummary = async (): Promise<OverviewSummaryResponse> => {
  return cachedGet('overview_summary', async () => {
    const res = await api.get<OverviewSummaryResponse>('/dynamic-world/overview/summary');
    return res.data;
  });
};

export const getDynamicWorldYears = async (city: string): Promise<DynamicWorldYearsResponse> => {
  const res = await api.get<DynamicWorldYearsResponse>(`/dynamic-world/${encodeURIComponent(city)}/years`);
  return res.data;
};

export const getDynamicWorldLayers = async (city: string): Promise<DynamicWorldLayersResponse> => {
  const res = await api.get<DynamicWorldLayersResponse>(`/dynamic-world/${encodeURIComponent(city)}/layers`);
  return res.data;
};

export const getDynamicWorldMetadata = async (city: string, year: number): Promise<DynamicWorldMetadata> => {
  return cachedGet(`meta:${city}:${year}`, async () => {
    const res = await api.get<DynamicWorldMetadata>(`/dynamic-world/${encodeURIComponent(city)}/metadata/${year}`);
    return res.data;
  });
};

export const getDynamicWorldStats = async (city: string, year: number): Promise<DynamicWorldClassStats> => {
  return cachedGet(`stats:${city}:${year}`, async () => {
    const res = await api.get<DynamicWorldClassStats>(`/dynamic-world/${encodeURIComponent(city)}/stats/${year}`);
    return res.data;
  });
};

export const getDynamicWorldChangeStats = async (city: string, fromYear: number, toYear: number): Promise<DynamicWorldChangeStats> => {
  return cachedGet(`chg:${city}:${fromYear}:${toYear}`, async () => {
    const res = await api.get<DynamicWorldChangeStats>(`/dynamic-world/${encodeURIComponent(city)}/change/${fromYear}/${toYear}/stats`);
    return res.data;
  });
};

export const getDynamicWorldTransitions = async (city: string, fromYear: number, toYear: number): Promise<DynamicWorldTransitionMatrix> => {
  const res = await api.get<DynamicWorldTransitionMatrix>(`/dynamic-world/${encodeURIComponent(city)}/change/${fromYear}/${toYear}/transitions`);
  return res.data;
};

export const getDynamicWorldRasterUrl = (city: string, layerId: string): string => {
  return `${API_BASE}/dynamic-world/${encodeURIComponent(city)}/raster/${encodeURIComponent(layerId)}`;
};

export const getDynamicWorldPreviewUrl = (city: string, layerId: string): string => {
  return `${API_BASE}/dynamic-world/${encodeURIComponent(city)}/preview/${encodeURIComponent(layerId)}?v=3`;
};
