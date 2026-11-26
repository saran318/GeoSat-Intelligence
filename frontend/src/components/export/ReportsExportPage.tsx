import React, { useState, useEffect, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { useRegionYearParams } from '@/hooks/useRegionYearParams';
import { fetchChangeAndTransitions } from '@/api/analyticsFetchers';
import type { DynamicWorldChangeStats } from '@/api/dynamicWorldTypes';
import { YearRangePills } from '@/components/shared/YearRangePills';
import { RegionSelector } from '@/components/shared/RegionSelector';
import { SectionSkeleton, SectionError } from '@/components/shared/AsyncStates';
import { TrendAreaTable } from '@/components/trends/TrendAreaTable';
import { DownloadActionPanel } from './DownloadActionPanel';

export const ReportsExportPage: React.FC = () => {
  const {
    cities,
    classDefs,
    loadingCities,
    citiesError,
    retryCities,
    region,
    setRegion,
    fromYear,
    toYear,
    availableYears,
    setFromYear,
    setToYear,
    swapYears,
  } = useRegionYearParams();

  const [changeStats, setChangeStats] = useState<DynamicWorldChangeStats | null>(null);
  const [loadingChange, setLoadingChange] = useState<boolean>(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!region || !fromYear || !toYear || fromYear >= toYear) return;
    setLoadingChange(true);
    setChangeError(null);
    try {
      const res = await fetchChangeAndTransitions(region, fromYear, toYear);
      setChangeStats(res.changeStats);
    } catch (err: any) {
      setChangeStats(null);
      setChangeError(err?.message || `Failed to load export statistics for ${region}.`);
    } finally {
      setLoadingChange(false);
    }
  }, [region, fromYear, toYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loadingCities && cities.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto w-full bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
        <SectionSkeleton rows={4} heightClass="h-10" />
      </div>
    );
  }

  if (citiesError && cities.length === 0) {
    return (
      <div className="max-w-[1280px] mx-auto w-full">
        <SectionError message={citiesError} onRetry={retryCities} />
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto w-full flex flex-col gap-6 animate-fadeIn font-sans">
      {/* 1. Selection Bar: Region + From/To Years (from URL ?region=&from=&to=) */}
      <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-primary font-semibold">
            Reports and Data
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {region || 'Select Region'} ({fromYear}–{toYear})
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <RegionSelector
              regions={cities.map((c) => c.name)}
              value={region}
              onChange={setRegion}
            />
          </div>

          <YearRangePills
            years={availableYears}
            fromYear={fromYear}
            toYear={toYear}
            onFromChange={setFromYear}
            onToChange={setToYear}
            onSwap={swapYears}
          />
        </div>
      </div>

      {/* 2. Export Action Cards */}
      <DownloadActionPanel
        region={region}
        fromYear={fromYear}
        toYear={toYear}
        changeStats={changeStats}
        classDefs={classDefs}
        loading={loadingChange}
        error={changeError}
        onRetry={loadData}
      />

      {/* 3. Real Esri Area Table */}
      <TrendAreaTable
        region={region}
        changeStats={changeStats}
        classDefs={classDefs}
        loading={loadingChange}
        error={changeError}
        onRetry={loadData}
      />
    </div>
  );
};
