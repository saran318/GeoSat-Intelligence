import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, ImageOverlay, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { DynamicWorldMetadata } from '@/api/dynamicWorldTypes';
import { getDynamicWorldPreviewUrl } from '@/api/dynamicWorldClient';
import { Loader2, AlertCircle, ChevronsLeftRight, ZoomIn, ZoomOut, X } from 'lucide-react';
import { DYNAMIC_WORLD_CLASSES } from '@/config/dynamicWorldClasses';

// Fits map dynamically to geographic boundary polygon or bounds
const MapBoundsFitter: React.FC<{
  bounds: [number, number, number, number] | null;
  boundaryData?: any;
  onBoundsFit?: () => void;
}> = ({ bounds, boundaryData, onBoundsFit }) => {
  const map = useMap();
  const onBoundsFitRef = useRef(onBoundsFit);
  onBoundsFitRef.current = onBoundsFit;

  useEffect(() => {
    if (boundaryData) {
      try {
        const geoLayer = L.geoJSON(boundaryData);
        const b = geoLayer.getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [24, 24], maxZoom: 14 });
          onBoundsFitRef.current?.();
          return;
        }
      } catch {
        // fallback to bbox below
      }
    }
    if (bounds && bounds.length === 4) {
      // API returns [minX, minY, maxX, maxY] which is [lngMin, latMin, lngMax, latMax]
      const leafletBounds = L.latLngBounds(
        [bounds[1], bounds[0]], // [latMin, lngMin]
        [bounds[3], bounds[2]]  // [latMax, lngMax]
      );
      map.fitBounds(leafletBounds, { padding: [24, 24], maxZoom: 14 });
      onBoundsFitRef.current?.();
    }
  }, [bounds, boundaryData, map]);
  return null;
};

// Custom Zoom Controls with custom styling matching theme
const CustomZoomControl: React.FC = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-6 right-6 z-[400] flex flex-col gap-1 bg-card/90 backdrop-blur-md p-1 rounded-xl border border-border shadow-md">
      <button
        onClick={() => map.zoomIn()}
        className="p-1.5 hover:bg-muted text-foreground rounded-lg transition-colors cursor-pointer"
        title="Zoom In"
        type="button"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
      <div className="h-[1px] bg-border/60 mx-1" />
      <button
        onClick={() => map.zoomOut()}
        className="p-1.5 hover:bg-muted text-foreground rounded-lg transition-colors cursor-pointer"
        title="Zoom Out"
        type="button"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
    </div>
  );
};

// Clipped Overlay component that calculates exact screen-aligned clipping
const ClippedOverlay: React.FC<{
  url: string;
  bounds: [number, number, number, number] | null;
  opacity: number;
  sliderPosPercentage?: number; // 0 to 100 percentage of the container width
  onLoad?: () => void;
  onError?: () => void;
}> = ({ url, bounds, opacity, sliderPosPercentage, onLoad, onError }) => {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay>(null);

  const updateClip = useCallback(() => {
    if (!overlayRef.current || sliderPosPercentage === undefined || !bounds) return;
    const el = overlayRef.current.getElement();
    if (!el) return;

    try {
      const container = map.getContainer();
      const containerWidth = container.clientWidth;
      const sliderPx = (containerWidth * sliderPosPercentage) / 100;

      // Calculate container pixel coordinates for image corners
      const nwLatLng = L.latLng(bounds[3], bounds[0]); // [latMax, lngMin]
      const seLatLng = L.latLng(bounds[1], bounds[2]); // [latMin, lngMax]

      const nw = map.latLngToContainerPoint(nwLatLng);
      const se = map.latLngToContainerPoint(seLatLng);

      const imgWidth = se.x - nw.x;

      if (imgWidth <= 0) {
        el.style.clipPath = 'none';
        return;
      }

      // Calculate how far the slider line is inside the image element
      const localX = sliderPx - nw.x;
      const clipPercentage = Math.max(0, Math.min(100, (localX / imgWidth) * 100));

      el.style.clipPath = `polygon(0 0, ${clipPercentage}% 0, ${clipPercentage}% 100%, 0 100%)`;
      (el.style as any).webkitClipPath = `polygon(0 0, ${clipPercentage}% 0, ${clipPercentage}% 100%, 0 100%)`;
    } catch {
      // Fallback to plain percentage if map projection is not ready
      if (el) {
        el.style.clipPath = `polygon(0 0, ${sliderPosPercentage}% 0, ${sliderPosPercentage}% 100%, 0 100%)`;
      }
    }
  }, [map, sliderPosPercentage, bounds]);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  // Hook into map movements to maintain pixel-perfect alignment
  useEffect(() => {
    updateClip();
    const el = overlayRef.current?.getElement();
    if (el && (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0) {
      onLoadRef.current?.();
    }
    map.on('move zoom viewreset resize', updateClip);
    return () => {
      map.off('move zoom viewreset resize', updateClip);
    };
  }, [map, updateClip, url]);

  if (!bounds) return null;
  const leafletBounds = L.latLngBounds([bounds[1], bounds[0]], [bounds[3], bounds[2]]);

  return (
    <ImageOverlay
      ref={overlayRef}
      url={url}
      bounds={leafletBounds}
      opacity={opacity}
      eventHandlers={{
        load: () => {
          updateClip();
          onLoad?.();
        },
        error: onError,
      }}
    />
  );
};

interface DynamicWorldMapProps {
  city: string;
  metadata: DynamicWorldMetadata | null;
  layerId: string;
  isSwipeMode?: boolean;
  swipeLayerId2?: string;
  swipeFromYear?: number;
  swipeToYear?: number;
  sliderPos?: number;
  onSliderPosChange?: (pos: number) => void;
  onBoundsFit?: () => void;
  activeFocusClass?: number | null;
  onResetFocusClass?: () => void;
  children?: React.ReactNode;
}

export const DynamicWorldMap: React.FC<DynamicWorldMapProps> = ({
  city,
  metadata,
  layerId,
  isSwipeMode = false,
  swipeLayerId2,
  swipeFromYear,
  swipeToYear,
  sliderPos,
  onSliderPosChange,
  onBoundsFit,
  activeFocusClass,
  onResetFocusClass,
  children,
}) => {
  const [internalSliderPos, setInternalSliderPos] = useState<number>(50);
  const currentSliderPos = sliderPos !== undefined ? sliderPos : internalSliderPos;
  const [boundaryData, setBoundaryData] = useState<any>(null);

  useEffect(() => {
    if (!city) {
      setBoundaryData(null);
      return;
    }
    const filename = `${city.toLowerCase().replace(/\s+/g, '_')}.geojson`;
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
    fetch(`${apiBase}/dynamic-world/${encodeURIComponent(city)}/boundary`)
      .then((res) => {
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('json')) return res.json();
        return fetch(`/boundaries/${filename}`).then((r) => r.ok ? r.json() : null);
      })
      .then((data) => {
        setBoundaryData(data);
      })
      .catch(() => {
        setBoundaryData(null);
      });
  }, [city]);

  const setEffectiveSliderPos = (pos: number) => {
    if (onSliderPosChange) {
      onSliderPosChange(pos);
    } else {
      setInternalSliderPos(pos);
    }
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loadingLayers, setLoadingLayers] = useState<Record<string, boolean>>({});
  const [errorLayers, setErrorLayers] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Sync layer loading states (only reset when city or layer IDs actually change, not on metadata re-renders)
  useEffect(() => {
    setLoadingLayers({
      [layerId]: true,
      ...(swipeLayerId2 ? { [swipeLayerId2]: true } : {}),
    });
    setErrorLayers({});
  }, [layerId, swipeLayerId2, city]);

  const handleLayerLoad = (id: string) => {
    setLoadingLayers((prev) => ({ ...prev, [id]: false }));
  };

  const handleLayerError = (id: string) => {
    setLoadingLayers((prev) => ({ ...prev, [id]: false }));
    setErrorLayers((prev) => ({ ...prev, [id]: true }));
  };

  // Draggable Divider Handlers with pointer capture & state preservation (Item 6)
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setEffectiveSliderPos(percentage);
  }, [onSliderPosChange]);

  const onPointerDownHandle = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (handleRef.current) {
      handleRef.current.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMoveContainer = (e: React.PointerEvent) => {
    if (isDragging) {
      updateSliderFromClientX(e.clientX);
    }
  };

  const onPointerUpHandle = (e: React.PointerEvent) => {
    setIsDragging(false);
    if (handleRef.current && handleRef.current.hasPointerCapture(e.pointerId)) {
      handleRef.current.releasePointerCapture(e.pointerId);
    }
  };

  // Metadata bounds take precedence; this only protects initial map rendering.
  const defaultCenter: [number, number] = [13.04, 80.24];

  const isLoadingCurrent =
    loadingLayers[layerId] || (isSwipeMode && swipeLayerId2 && loadingLayers[swipeLayerId2]);
  const hasErrorCurrent =
    errorLayers[layerId] || (isSwipeMode && swipeLayerId2 && errorLayers[swipeLayerId2]);

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMoveContainer}
      className="w-full h-full min-h-[500px] lg:min-h-[580px] xl:min-h-[640px] relative rounded-2xl overflow-hidden border border-border/80 bg-background shadow-xs select-none"
    >
      {/* Loading Indicator */}
      {isLoadingCurrent && (
        <div className="absolute inset-0 z-[500] bg-background/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-none transition-all">
          <div className="bg-card/95 border border-border px-4 py-2 rounded-full shadow-lg flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-mono font-medium text-foreground">
              Rendering Dynamic World Preview...
            </span>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {hasErrorCurrent && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[500] bg-destructive/10 border border-destructive/30 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-xs font-medium">Unable to load Dynamic World layer.</span>
        </div>
      )}

      {/* Main Map Container */}
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full z-10"
        zoomControl={false}
      >
        <MapBoundsFitter bounds={metadata?.bounds || null} boundaryData={boundaryData} onBoundsFit={onBoundsFit} />

        {/* Clear, Light OpenStreetMap Basemap (Key-Free, Road & Water Label Clarity) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="opacity-75 saturate-70"
        />

        {/* Thin Leaflet District Boundary Outline */}
        {boundaryData && (
          <GeoJSON
            key={`boundary-${city}`}
            data={boundaryData}
            style={{
              color: '#38bdf8',
              weight: 1.5,
              fillOpacity: 0,
              opacity: 0.95,
            }}
          />
        )}

        {/* Single Layer Mode */}
        {!isSwipeMode && metadata && (
          <ClippedOverlay
            key={`single-${city}-${layerId}`}
            url={getDynamicWorldPreviewUrl(city, layerId)}
            bounds={metadata.bounds}
            opacity={1.0}
            onLoad={() => handleLayerLoad(layerId)}
            onError={() => handleLayerError(layerId)}
          />
        )}

        {/* Swipe Comparison Mode */}
        {isSwipeMode && metadata && swipeLayerId2 && (
          <>
            {/* Background comparison year (right side) */}
            <ClippedOverlay
              key={`swipe2-${city}-${swipeLayerId2}`}
              url={getDynamicWorldPreviewUrl(city, swipeLayerId2)}
              bounds={metadata.bounds}
              opacity={1.0}
              onLoad={() => handleLayerLoad(swipeLayerId2)}
              onError={() => handleLayerError(swipeLayerId2)}
            />

            {/* Foreground comparison year (left side) */}
            <ClippedOverlay
              key={`swipe1-${city}-${layerId}`}
              url={getDynamicWorldPreviewUrl(city, layerId)}
              bounds={metadata.bounds}
              opacity={1.0}
              sliderPosPercentage={currentSliderPos}
              onLoad={() => handleLayerLoad(layerId)}
              onError={() => handleLayerError(layerId)}
            />
          </>
        )}

        {/* Custom Zoom Button Controls */}
        <CustomZoomControl />
      </MapContainer>

      {/* Swipe Mode Floating Year Labels & Divider Handle (Item 6) */}
      {isSwipeMode && (
        <>
          {/* Top-left comparison year (From-year left) */}
          <div className="absolute top-4 left-4 z-[400] bg-card/95 backdrop-blur-md text-foreground px-3 py-1.5 rounded-xl border border-border/80 shadow-md pointer-events-none select-none">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs font-bold font-mono tracking-tight text-foreground leading-tight">
                From: {swipeFromYear ?? '—'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-primary font-medium uppercase tracking-wider">
              Left / Before
            </div>
          </div>

          {/* Top-right comparison year (To-year right, non-overlapping with floating legend) */}
          <div className="absolute top-4 right-[260px] z-[390] bg-card/95 backdrop-blur-md text-foreground px-3 py-1.5 rounded-xl border border-border/80 shadow-md pointer-events-none select-none text-right hidden sm:block">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs font-bold font-mono tracking-tight text-foreground leading-tight">
                To: {swipeToYear ?? '—'}
              </span>
              <span className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <div className="text-[10px] font-mono text-primary font-medium uppercase tracking-wider">
              Right / After
            </div>
          </div>

          {/* Draggable Vertical Divider Handle */}
          <div
            ref={handleRef}
            onPointerDown={onPointerDownHandle}
            onPointerUp={onPointerUpHandle}
            className="absolute top-0 bottom-0 w-[2px] bg-white z-[400] flex items-center justify-center cursor-ew-resize select-none"
            style={{
              left: `${currentSliderPos}%`,
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Circular Dark-Green Handle */}
            <div
              className={`w-9 h-9 rounded-full bg-[#1b432a] text-white border-2 border-white shadow-2xl flex items-center justify-center transition-transform cursor-ew-resize ${
                isDragging ? 'scale-110 ring-4 ring-emerald-500/30' : 'hover:scale-105'
              }`}
            >
              <ChevronsLeftRight className="h-4 w-4" />
            </div>
          </div>
        </>
      )}

      {/* Floating Active Highlight/Isolate Banner (Item 5) */}
      {activeFocusClass !== null && activeFocusClass !== undefined && DYNAMIC_WORLD_CLASSES[activeFocusClass] && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[450] bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/20 shadow-xl flex items-center gap-2 font-mono text-xs animate-fadeIn">
          <span
            className="w-3 h-3 rounded-xs shrink-0 border border-white/30"
            style={{ backgroundColor: DYNAMIC_WORLD_CLASSES[activeFocusClass].color }}
          />
          <span>
            Highlighting: <strong className="text-white">{DYNAMIC_WORLD_CLASSES[activeFocusClass].name}</strong>
          </span>
          {onResetFocusClass && (
            <button
              type="button"
              onClick={onResetFocusClass}
              className="ml-1 p-0.5 hover:bg-white/20 rounded transition-colors cursor-pointer text-white/80 hover:text-white"
              title="Clear highlight"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Children elements (e.g. Floating Legend in upper-right) */}
      {children}
    </div>
  );
};
