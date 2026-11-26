import React, { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { 
  getDynamicWorldCities, 
  getDynamicWorldLayers, 
  getDynamicWorldMetadata,
  getDynamicWorldStats,
  getDynamicWorldChangeStats,
  getDynamicWorldTransitions
} from '@/api/dynamicWorldClient';
import type { 
  DynamicWorldCity, 
  DynamicWorldClassDef,
  DynamicWorldLayer, 
  DynamicWorldMetadata,
  DynamicWorldClassStats,
  DynamicWorldChangeStats,
  DynamicWorldTransitionMatrix
} from '@/api/dynamicWorldTypes';
import { DynamicWorldMap } from './DynamicWorldMap';
import { DynamicWorldControls } from './DynamicWorldControls';
import { DynamicWorldStats } from './DynamicWorldStats';
import { DynamicWorldLegend } from './DynamicWorldLegend';
import { ApiOfflineBanner } from '../common/ApiOfflineBanner';

export const DynamicWorldDashboard: React.FC<{ initialCity?: string }> = ({ initialCity }) => {
  const [cities, setCities] = useState<DynamicWorldCity[]>([]);
  const [classDefs, setClassDefs] = useState<DynamicWorldClassDef[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [availableLayers, setAvailableLayers] = useState<DynamicWorldLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  
  const [metadata, setMetadata] = useState<DynamicWorldMetadata | null>(null);
  const [stats2019, setStats2019] = useState<DynamicWorldClassStats | null>(null);
  const [stats2023, setStats2023] = useState<DynamicWorldClassStats | null>(null);
  const [changeStats, setChangeStats] = useState<DynamicWorldChangeStats | null>(null);
  const [transitionMatrix, setTransitionMatrix] = useState<DynamicWorldTransitionMatrix | null>(null);
  const [changeStatsError, setChangeStatsError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hover & Isolate states for linking Table, Legend, and Map (Item 5)
  const [hoveredClass, setHoveredClass] = useState<number | null>(null);
  const [isolatedClass, setIsolatedClass] = useState<number | null>(null);

  // Persistent swipe slider position across year changes (Item 6)
  const [sliderPos, setSliderPos] = useState<number>(50);

  // 1. Initial Load: Fetch Available Cities
  useEffect(() => {
    let isMounted = true;
    const fetchCities = async () => {
      try {
        setLoading(true);
        setError(null);
        const { cities: fetchedCities, classes: fetchedClasses } = await getDynamicWorldCities();
        if (isMounted) {
          setCities(fetchedCities);
          if (fetchedClasses && fetchedClasses.length > 0) {
            setClassDefs(fetchedClasses);
          }
          if (fetchedCities.length > 0) {
            const preferred = initialCity
              ? fetchedCities.find((c) => c.name.toLowerCase() === initialCity.toLowerCase())
              : undefined;
            const chennai = fetchedCities.find((c) => c.name.toLowerCase() === 'chennai');
            setSelectedCity(preferred ? preferred.name : chennai ? chennai.name : fetchedCities[0].name);
          } else {
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to connect to Dynamic World API service.');
          setLoading(false);
        }
      }
    };
    fetchCities();
    return () => { isMounted = false; };
  }, []);

  // 2. Fetch Layers when City Changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedCity) return;

    const fetchLayers = async () => {
      setAvailableLayers([]);
      setAvailableYears([]);
      setSelectedLayerId('');
      setMetadata(null);
      setStats2019(null);
      setStats2023(null);
      setChangeStats(null);
      setTransitionMatrix(null);
      try {
        setLoading(true);
        setError(null);
        const res = await getDynamicWorldLayers(selectedCity);
        if (isMounted) {
          const rawLayers = res.layers;
          const constructedLayers: DynamicWorldLayer[] = [];
          const landcoverYears = rawLayers
            .filter((l) => l.type === 'landcover' && l.year)
            .map((l) => l.year as number)
            .sort((a, b) => a - b);

          setAvailableYears(landcoverYears);

          for (const year of landcoverYears) {
            constructedLayers.push({
              id: `dynamic_world_${year}`,
              type: 'landcover',
              year,
            });
          }

          if (landcoverYears.length >= 2) {
            const fromYear = landcoverYears[0];
            const toYear = landcoverYears[landcoverYears.length - 1];
            constructedLayers.push({
              id: `swipe_${fromYear}_${toYear}`,
              type: 'landcover',
              from_year: fromYear,
              to_year: toYear,
            });
          }

          const changeLayers = rawLayers
            .filter((l) => l.type === 'change')
            .sort((a, b) => (a.from_year ?? 0) - (b.from_year ?? 0));
          constructedLayers.push(...changeLayers);

          const transitionLayers = rawLayers
            .filter((l) => l.type === 'transition')
            .sort((a, b) => (a.from_year ?? 0) - (b.from_year ?? 0));
          constructedLayers.push(...transitionLayers);

          const finalLayers = constructedLayers.length > 0 ? constructedLayers : rawLayers;
          setAvailableLayers(finalLayers);

          const defaultSwipe = finalLayers.find((l) => l.id.startsWith('swipe_'));
          setSelectedLayerId(defaultSwipe ? defaultSwipe.id : (finalLayers[0]?.id || ''));
        }
      } catch (err: any) {
        if (isMounted) {
          setAvailableLayers([]);
          setSelectedLayerId('');
          setError('No Dynamic World data has been generated for this city yet.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLayers();
    return () => { isMounted = false; };
  }, [selectedCity]);

  // 3. Fetch Metadata for Bounds Fitting
  useEffect(() => {
    let isMounted = true;
    if (!selectedCity) return;

    const fetchMeta = async () => {
      try {
        const years = availableYears.length
          ? availableYears
          : (await getDynamicWorldCities()).cities
              .find((city) => city.name === selectedCity)?.available_years || [];
        const year = years[0];
        if (!year) return;
        const meta = await getDynamicWorldMetadata(selectedCity, year);
        if (isMounted && meta) setMetadata(meta);
      } catch (err) {
        console.warn('Metadata fetch warning:', err);
      }
    };

    fetchMeta();
    return () => { isMounted = false; };
  }, [selectedCity, availableYears]);

  // 4. Load available endpoint years and current boundary statistics
  useEffect(() => {
    let isMounted = true;
    if (!selectedCity) return;

    const loadAllStats = async () => {
      setLoadingStats(true);
      try {
        const swipeMatch = selectedLayerId.match(/^swipe_(\d{4})_(\d{4})$/);
        const singleMatch = selectedLayerId.match(/^dynamic_world_(\d{4})$/);

        let firstYear = availableYears[0];
        let lastYear = availableYears[availableYears.length - 1];

        if (swipeMatch) {
          firstYear = Number(swipeMatch[1]);
          lastYear = Number(swipeMatch[2]);
        } else if (singleMatch) {
          firstYear = Number(singleMatch[1]);
          lastYear = availableYears[availableYears.length - 1];
        }

        const [firstStats, lastStats] = await Promise.allSettled([
          firstYear ? getDynamicWorldStats(selectedCity, firstYear) : Promise.reject(),
          lastYear ? getDynamicWorldStats(selectedCity, lastYear) : Promise.reject(),
        ]);
        if (isMounted) {
          if (firstStats.status === 'fulfilled') setStats2019(firstStats.value);
          if (lastStats.status === 'fulfilled') setStats2023(lastStats.value);
        }
      } catch (err) {
        console.warn('Failed to load some statistics:', err);
      } finally {
        if (isMounted) setLoadingStats(false);
      }
    };

    loadAllStats();
    return () => { isMounted = false; };
  }, [selectedCity, availableYears, selectedLayerId]);

  // 5. Load statistics for the active change or transition period
  const loadPeriodStats = async (fromYear: number, toYear: number) => {
    if (!selectedCity) return;
    setLoadingStats(true);
    setChangeStatsError(null);
    try {
      const [changeResult, transitionResult] = await Promise.allSettled([
        getDynamicWorldChangeStats(selectedCity, fromYear, toYear),
        getDynamicWorldTransitions(selectedCity, fromYear, toYear),
      ]);
      if (changeResult.status === 'fulfilled') {
        setChangeStats(changeResult.value);
      } else {
        setChangeStats(null);
        setChangeStatsError('Failed to load comparison statistics');
      }
      if (transitionResult.status === 'fulfilled') {
        setTransitionMatrix(transitionResult.value);
      } else {
        setTransitionMatrix(null);
      }
    } catch (err) {
      setChangeStats(null);
      setChangeStatsError('Failed to connect to comparison service');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!selectedCity) return;

    const periodMatch = selectedLayerId.match(/(?:swipe|change|transition)_(\d{4})_(\d{4})/);
    if (!periodMatch) {
      setChangeStats(null);
      setTransitionMatrix(null);
      setChangeStatsError(null);
      return;
    }

    const fromYear = Number(periodMatch[1]);
    const toYear = Number(periodMatch[2]);
    loadPeriodStats(fromYear, toYear);
  }, [selectedCity, selectedLayerId]);

  const handleRetryChangeStats = () => {
    const periodMatch = selectedLayerId.match(/(?:swipe|change|transition)_(\d{4})_(\d{4})/);
    if (periodMatch) {
      loadPeriodStats(Number(periodMatch[1]), Number(periodMatch[2]));
    }
  };

  if (loading && cities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-36 text-muted-foreground animate-fadeIn font-mono">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <span className="text-xs uppercase tracking-widest text-foreground font-semibold">
          Acquiring Dynamic World Telemetry...
        </span>
      </div>
    );
  }

  if (error && cities.length === 0) {
    return (
      <div className="py-12 max-w-lg mx-auto bg-card border border-border/80 rounded-2xl shadow-xs">
        <ApiOfflineBanner
          message={error || 'Unable to establish connection with the Dynamic World API backend. Please ensure the FastAPI server is active.'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  const activeLayer = availableLayers.find((l) => l.id === selectedLayerId) || availableLayers[0];
  const isSwipeMode = selectedLayerId.startsWith('swipe_');
  const swipeMatch = selectedLayerId.match(/^swipe_(\d{4})_(\d{4})$/);
  const swipeFromYear = swipeMatch ? Number(swipeMatch[1]) : undefined;
  const swipeToYear = swipeMatch ? Number(swipeMatch[2]) : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full animate-fadeIn font-sans">
      {/* LEFT: Compact Information & Controls Sidebar (approx 25–28%) */}
      <div className="w-full lg:w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-5">
        <DynamicWorldControls
          cities={cities}
          classDefs={classDefs}
          selectedCity={selectedCity}
          onCityChange={setSelectedCity}
          availableLayers={availableLayers}
          selectedLayerId={selectedLayerId}
          onLayerChange={setSelectedLayerId}
          changeStats={changeStats}
          loadingChangeStats={loadingStats}
          changeStatsError={changeStatsError}
          onRetryChangeStats={handleRetryChangeStats}
        />
      </div>

      {/* RIGHT: Large Interactive Map & Bottom Analytical Cards (approx 72–75%) */}
      <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
        {/* Large Leaflet Map Workspace */}
        <div className="relative w-full h-[540px] md:h-[600px] xl:h-[660px]">
          {activeLayer ? (
            <DynamicWorldMap
              city={selectedCity}
              metadata={metadata}
              layerId={isSwipeMode ? `dynamic_world_${swipeFromYear}` : activeLayer.id}
              isSwipeMode={isSwipeMode}
              swipeLayerId2={isSwipeMode ? `dynamic_world_${swipeToYear}` : undefined}
              swipeFromYear={swipeFromYear}
              swipeToYear={swipeToYear}
              sliderPos={sliderPos}
              onSliderPosChange={setSliderPos}
              onBoundsFit={() => setSliderPos(50)}
              activeFocusClass={isolatedClass ?? hoveredClass}
              onResetFocusClass={() => {
                setHoveredClass(null);
                setIsolatedClass(null);
              }}
            >
              {/* Floating Dynamic World Legend in Upper-Right */}
              <div className="absolute top-4 right-4 z-[400]">
                <DynamicWorldLegend
                  mode={isSwipeMode ? 'swipe' : activeLayer.type}
                  classDefs={classDefs}
                  samplingMeters={stats2019?.sampling_meters ?? metadata?.resolution?.[0]}
                  hoveredClass={hoveredClass}
                  isolatedClass={isolatedClass}
                  onHoverClass={setHoveredClass}
                  onIsolateClass={setIsolatedClass}
                />
              </div>
            </DynamicWorldMap>
          ) : loading ? (
            <div className="w-full h-full min-h-[500px] rounded-2xl border border-border/80 bg-muted/20 flex flex-col items-center justify-center text-center px-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <h3 className="text-base font-bold text-foreground">Loading {selectedCity} telemetry...</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                Preparing land cover layers and boundary geometry.
              </p>
            </div>
          ) : (
            <div className="w-full h-full min-h-[500px] rounded-2xl border border-border/80 bg-muted/20 flex flex-col items-center justify-center text-center px-6">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
              <h3 className="text-base font-bold text-foreground">Dynamic World data unavailable</h3>
              <p className="text-xs text-muted-foreground mt-2 max-w-md">
                {error || `${selectedCity} has no generated annual or change-detection layers yet.`}
              </p>
            </div>
          )}
        </div>

        {/* BOTTOM: Analytical Statistics Cards */}
        {activeLayer && (
          <DynamicWorldStats
            city={selectedCity}
            layer={activeLayer}
            classDefs={classDefs}
            metadata={metadata}
            stats2019={stats2019}
            stats2023={stats2023}
            changeStats={changeStats}
            transitionMatrix={transitionMatrix}
            loading={loadingStats}
            hoveredClass={hoveredClass}
            isolatedClass={isolatedClass}
            onHoverClass={setHoveredClass}
            onIsolateClass={setIsolatedClass}
          />
        )}
      </div>
    </div>
  );
};

export default DynamicWorldDashboard;
