import { useState, useEffect, useCallback } from 'react';
import type { DynamicWorldCity, DynamicWorldClassDef } from '@/api/dynamicWorldTypes';
import { fetchRegionsWithClasses } from '@/api/analyticsFetchers';

export interface RegionYearState {
  cities: DynamicWorldCity[];
  classDefs: DynamicWorldClassDef[];
  loadingCities: boolean;
  citiesError: string | null;
  retryCities: () => void;
  region: string;
  setRegion: (region: string) => void;
  fromYear: number;
  toYear: number;
  availableYears: number[];
  setFromYear: (year: number) => void;
  setToYear: (year: number) => void;
  swapYears: () => void;
}

const DEFAULT_FROM = 2019;
const DEFAULT_TO = 2025;

export function useRegionYearParams(): RegionYearState {
  const [cities, setCities] = useState<DynamicWorldCity[]>([]);
  const [classDefs, setClassDefs] = useState<DynamicWorldClassDef[]>([]);
  const [loadingCities, setLoadingCities] = useState<boolean>(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [region, setRegionState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('region') || '';
  });

  const [fromYear, setFromYearState] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const val = Number(params.get('from'));
    return Number.isFinite(val) && val > 2000 ? val : DEFAULT_FROM;
  });

  const [toYear, setToYearState] = useState<number>(() => {
    const params = new URLSearchParams(window.location.search);
    const val = Number(params.get('to'));
    return Number.isFinite(val) && val > 2000 ? val : DEFAULT_TO;
  });

  const loadCities = useCallback(async () => {
    setLoadingCities(true);
    setCitiesError(null);
    try {
      const res = await fetchRegionsWithClasses();
      const list = res.cities || [];
      setCities(list);
      setClassDefs(res.classes || []);
      setRegionState((prev) => {
        if (prev && list.some((c) => c.name === prev)) return prev;
        const chennai = list.find((c) => c.name.toLowerCase() === 'chennai');
        return chennai ? chennai.name : list[0]?.name || '';
      });
    } catch (err: any) {
      setCities([]);
      setCitiesError(err?.message || 'Unable to load Tamil Nadu regions.');
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const activeCityObj = cities.find((c) => c.name === region);
  const availableYears = (activeCityObj?.available_years || []).slice().sort((a, b) => a - b);

  // Enforce From < To within availableYears when cities load
  useEffect(() => {
    if (availableYears.length < 2) return;
    const minY = availableYears[0];
    const maxY = availableYears[availableYears.length - 1];
    let nextFrom = availableYears.includes(fromYear) ? fromYear : minY;
    let nextTo = availableYears.includes(toYear) ? toYear : maxY;
    if (nextFrom >= nextTo) {
      nextFrom = minY;
      nextTo = maxY;
    }
    if (nextFrom !== fromYear) setFromYearState(nextFrom);
    if (nextTo !== toYear) setToYearState(nextTo);
  }, [availableYears.join(',')]);

  // Persist region, from, and to in URL query string
  useEffect(() => {
    if (!region) return;
    const url = new URL(window.location.href);
    url.searchParams.set('region', region);
    url.searchParams.set('from', String(fromYear));
    url.searchParams.set('to', String(toYear));
    window.history.replaceState({}, '', url.toString());
  }, [region, fromYear, toYear]);

  const setRegion = useCallback((next: string) => {
    setRegionState(next);
  }, []);

  const setFromYear = useCallback(
    (y: number) => {
      if (y < toYear) {
        setFromYearState(y);
      } else if (availableYears.length >= 2) {
        const nextHigher = availableYears.find((ay) => ay > y);
        if (nextHigher) {
          setFromYearState(y);
          setToYearState(nextHigher);
        }
      }
    },
    [toYear, availableYears]
  );

  const setToYear = useCallback(
    (y: number) => {
      if (y > fromYear) {
        setToYearState(y);
      } else if (availableYears.length >= 2) {
        const prevLower = [...availableYears].reverse().find((ay) => ay < y);
        if (prevLower) {
          setFromYearState(prevLower);
          setToYearState(y);
        }
      }
    },
    [fromYear, availableYears]
  );

  const swapYears = useCallback(() => {
    // Swap button: since From must always be before To, cycle to full span or toggle adjacent
    if (availableYears.length < 2) return;
    const minY = availableYears[0];
    const maxY = availableYears[availableYears.length - 1];
    if (fromYear === minY && toYear === maxY && availableYears.length >= 3) {
      setFromYearState(availableYears[1]);
    } else {
      setFromYearState(minY);
      setToYearState(maxY);
    }
  }, [availableYears, fromYear, toYear]);

  return {
    cities,
    classDefs,
    loadingCities,
    citiesError,
    retryCities: loadCities,
    region,
    setRegion,
    fromYear,
    toYear,
    availableYears,
    setFromYear,
    setToYear,
    swapYears,
  };
}
