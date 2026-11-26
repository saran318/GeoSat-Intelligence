-- GeoSat Intelligence — Supabase (PostgreSQL) Schema for Structured Analytics
-- Run this in the Supabase SQL Editor before running scripts/seed_supabase.py

CREATE TABLE IF NOT EXISTS public.esri_regions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('region', 'state', 'district', 'city')),
    parent TEXT,
    tile TEXT,
    crs TEXT DEFAULT 'EPSG:32644',
    bbox JSONB NOT NULL,
    center JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.esri_year_stats (
    id BIGSERIAL PRIMARY KEY,
    location_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    cache_key TEXT NOT NULL UNIQUE,
    total_pixels BIGINT NOT NULL,
    total_area_km2 DOUBLE PRECISION NOT NULL,
    classes JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esri_year_stats_loc_year
    ON public.esri_year_stats (location_id, year);

CREATE TABLE IF NOT EXISTS public.esri_change_stats (
    id BIGSERIAL PRIMARY KEY,
    location_id TEXT NOT NULL,
    from_year INTEGER NOT NULL,
    to_year INTEGER NOT NULL,
    total_pixels BIGINT NOT NULL,
    changed_pixels BIGINT NOT NULL,
    unchanged_pixels BIGINT NOT NULL,
    change_percentage DOUBLE PRECISION NOT NULL,
    classes JSONB NOT NULL,
    transitions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (location_id, from_year, to_year)
);

CREATE INDEX IF NOT EXISTS idx_esri_change_stats_loc
    ON public.esri_change_stats (location_id, from_year, to_year);
