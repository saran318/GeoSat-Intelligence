import {
  getDynamicWorldCities,
  getDynamicWorldStats,
  getDynamicWorldChangeStats,
  getDynamicWorldTransitions,
} from './dynamicWorldClient';
import type {
  DynamicWorldCitiesResponse,
  DynamicWorldClassStats,
  DynamicWorldChangeStats,
  DynamicWorldTransitionMatrix,
} from './dynamicWorldTypes';

const transitionsCache = new Map<string, DynamicWorldTransitionMatrix>();
const seriesCache = new Map<string, DynamicWorldClassStats[]>();

export async function fetchRegionsWithClasses(): Promise<DynamicWorldCitiesResponse> {
  return getDynamicWorldCities();
}

export async function fetchYearlyStatsSeries(
  city: string,
  years: number[]
): Promise<DynamicWorldClassStats[]> {
  const key = `${city}:${years.join(',')}`;
  if (seriesCache.has(key)) {
    return seriesCache.get(key)!;
  }
  const results = await Promise.all(years.map((y) => getDynamicWorldStats(city, y)));
  seriesCache.set(key, results);
  return results;
}

export async function fetchChangeAndTransitions(
  city: string,
  fromYear: number,
  toYear: number
): Promise<{
  changeStats: DynamicWorldChangeStats;
  transitions: DynamicWorldTransitionMatrix | null;
}> {
  const changeStats = await getDynamicWorldChangeStats(city, fromYear, toYear);
  const trKey = `${city}:${fromYear}:${toYear}`;
  let transitions: DynamicWorldTransitionMatrix | null = transitionsCache.get(trKey) || null;
  if (!transitions) {
    try {
      transitions = await getDynamicWorldTransitions(city, fromYear, toYear);
      transitionsCache.set(trKey, transitions);
    } catch {
      transitions = null;
    }
  }
  return { changeStats, transitions };
}
