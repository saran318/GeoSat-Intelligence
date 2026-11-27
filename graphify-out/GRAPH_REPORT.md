# Graph Report - geo_sat_project  (2026-11-27)

## Corpus Check
- 130 files · ~104,411 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1122 nodes · 1727 edges · 91 communities (78 shown, 13 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bc3b9291`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api/esri.py
- .resolve_layer_path
- backend_client.py
- test_dynamic_world.py
- dynamicWorldClient.ts
- client.ts
- devDependencies
- dependencies
- compilerOptions
- Geo-Satellite Imagery Project
- test_api.py
- DynamicWorldDashboard.tsx
- 🛰️ GeoSat Intelligence — Complete Project Guide
- 🛰️ GeoSat Intelligence — Complete Project Guide
- compilerOptions
- MASTER_WALKTHROUGH.md
- inference/predict.py
- components.json
- App.tsx
- utils.py
- AboutPage.tsx
- react
- download_dynamic_world.py
- test_overview_performance.py
- GPT & Open Source Models Adapter
- DynamicWorldService
- Section 1: Remote Sensing & Satellite Imagery Fundamentals
- Section 2: Deep Learning & ResNet50 Architecture
- Gemini Adapter
- ErrorBoundary
- navigation-menu.tsx
- Colab 10-City Batch Processing Guide
- 2. Detailed Misclassification Case Studies
- Section 6: Web Backend, FastAPI, & API Design
- Any
- plugins
- dynamicWorldClasses.ts
- generate_esri_timelapse_gif.py
- Claude Adapter
- ChangeAnalyticsPage.tsx
- Master Viva Preparation Guide: 50 Questions & Answers
- Section 5: Change Detection & Area Statistics
- Supabase Free Keepalive Workflow
- DownloadActionPanel.tsx
- TypographyGuide.tsx
- vercel.json
- Section 3: Data Preprocessing & Memory Optimization
- Section 4: Spatial Tiling, Stitching, & Georeferencing
- seed_supabase.py
- run_real_pipeline.py
- upload_to_r2.py
- setup_search.sh script
- React + TypeScript + Vite
- pdfReport.ts
- tsconfig.json
- run_backend.py
- search_repo.sh script
- validate-agents.sh script
- validate-all.sh script
- validate-encoding.sh script
- validate-skills.sh script
- validate-templates.sh script
- validate-workflows.sh script
- test_security.py
- detect_change_dynamic_world.py
- test_utils_and_app_import_without_torch
- EsriService
- test_dual_tile_district_returns_none_url_and_merges_rasters
- security.py
- main.py
- api_root
- test_preview_fallback.py
- InMemoryRateLimiter
- backend_config.py
- PrivacyPage.tsx
- .get_hierarchy
- SecurityMiddleware
- process_dynamic_world_cities.py

## God Nodes (most connected - your core abstractions)
1. `EsriService` - 65 edges
2. `DynamicWorldService` - 43 edges
3. `react` - 32 edges
4. `compilerOptions` - 19 edges
5. `compilerOptions` - 15 edges
6. `generate_change_map()` - 14 edges
7. `compute_landcover_area_stats()` - 14 edges
8. `compute_change_detection()` - 13 edges
9. `align_and_load_rasters()` - 12 edges
10. `classify_tile()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `get_overview_summary()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/api/dynamic_world.py → geo_sat project/app/services/esri_service.py
- `get_boundary()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/api/dynamic_world.py → geo_sat project/app/services/esri_service.py
- `get_hierarchy()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/api/esri.py → geo_sat project/app/services/esri_service.py
- `get_tiles()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/api/esri.py → geo_sat project/app/services/esri_service.py
- `get_location()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/api/esri.py → geo_sat project/app/services/esri_service.py

## Import Cycles
- None detected.

## Communities (91 total, 13 thin omitted)

### Community 0 - "api/esri.py"
Cohesion: 0.14
Nodes (28): get_change_stats(), get_hierarchy(), get_location(), get_tiles(), get_visual_resource_gif(), get_visual_resource_metadata(), get_year_stats(), get (+20 more)

### Community 1 - ".resolve_layer_path"
Cohesion: 0.12
Nodes (13): Any, Streams a bounded-memory multi-tile merge directly to disk using gdalwarp CLI., Resolves to the physical GeoTIFF raster, merging multiple tiles in bounded…, Resolves to the Cloudflare R2 GeoTIFF URL for single-tile districts when R2 is…, Calculates exact class distribution for the city window., Calculates multi-year pixel-wise change and net class fluxes., Computes real directional transition matrix across Esri classes., Validates layer_id prefix and extracts the target year. (+5 more)

### Community 2 - "backend_client.py"
Cohesion: 0.06
Nodes (62): Affine, CRS, DataFrame, Figure, analyze_change_detection(), ChangeDetectionResponse, classify_satellite_tile(), get_available_cities() (+54 more)

### Community 3 - "test_dynamic_world.py"
Cohesion: 0.14
Nodes (13): load_city_roi(), Verify that class IDs map correctly and we have exactly 9 classes., Verify we have exactly 9 probability bands mapped properly., Verify Chennai ROI is parsed correctly from config., Verify nodata (255) is explicitly excluded from class distribution., Verify water pixels (0) are not confused with nodata (255)., test_compute_statistics_nodata_handling(), test_compute_statistics_water_preservation() (+5 more)

### Community 4 - "dynamicWorldClient.ts"
Cohesion: 0.08
Nodes (33): fetchChangeAndTransitions(), fetchRegionsWithClasses(), fetchYearlyStatsSeries(), seriesCache, transitionsCache, api, API_BASE, cachedGet() (+25 more)

### Community 5 - "client.ts"
Cohesion: 0.09
Nodes (32): api, API_BASE, checkHealth(), fetchEsriChange(), fetchEsriHierarchy(), fetchEsriStats(), fetchEsriVisualResource(), predictPatch() (+24 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (32): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/leaflet, @types/node (+24 more)

### Community 8 - "dependencies"
Cohesion: 0.07
Nodes (27): axios, class-variance-authority, clsx, framer-motion, dependencies, axios, class-variance-authority, clsx (+19 more)

### Community 9 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+17 more)

### Community 10 - "Geo-Satellite Imagery Project"
Cohesion: 0.08
Nodes (23): Architectures, Configuration (`training/config.py`), Copernicus Open Access Hub (Copernicus Data Space Ecosystem), Dataset Overview, Geo-Satellite Imagery Project, Google Colab Setup, Google Earth Engine (GEE), GPU Setup (+15 more)

### Community 11 - "test_api.py"
Cohesion: 0.10
Nodes (22): create_mock_multiband_tiff(), insufficient_bands_tiff_file(), fixture, Test suite for the Person 2 Backend API. Uses pytest and FastAPI's TestClient…, Test the GET /health endpoint to ensure it returns 200 OK and correctly…, Test POST /predict with a valid 4-band Sentinel-2 image. Verifies that the…, Test POST /predict with an unsupported file extension (e.g., .png). Verifies…, Test POST /predict with a file that has a valid extension (.tif) but corrupted… (+14 more)

### Community 12 - "DynamicWorldDashboard.tsx"
Cohesion: 0.12
Nodes (12): ApiOfflineBanner(), ApiOfflineBannerProps, DynamicWorldControls(), DynamicWorldControlsProps, DynamicWorldDashboard(), DynamicWorldLegend(), DynamicWorldLegendProps, DynamicWorldMap() (+4 more)

### Community 13 - "🛰️ GeoSat Intelligence — Complete Project Guide"
Cohesion: 0.10
Nodes (20): 1. Backend Server (FastAPI), 📌 1. Project Overview, 2. Frontend Server (Vite), 🏗️ 2. High-Level Architecture, ⚙️ 3. Backend Architecture (`geo_sat project/`), 🎨 4. Frontend Architecture (`frontend/`), 🗺️ 5. Dataset Specifications (`TN-1` & `TN-2`), 🚀 6. How to Run the Project (+12 more)

### Community 14 - "🛰️ GeoSat Intelligence — Complete Project Guide"
Cohesion: 0.10
Nodes (20): 1. Backend Server (FastAPI), 📌 1. Project Overview, 2. Frontend Server (Vite), 🏗️ 2. High-Level Architecture, ⚙️ 3. Backend Architecture (`geo_sat project/`), 🎨 4. Frontend Architecture (`frontend/`), 🗺️ 5. Dataset Specifications (`TN-1` & `TN-2`), 🚀 6. How to Run the Project (+12 more)

### Community 15 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+11 more)

### Community 16 - "MASTER_WALKTHROUGH.md"
Cohesion: 0.10
Nodes (19): Complete Project Workflow, Expected Inputs (Inference), Expected Outputs (Inference), Files Person 2 Should NEVER Modify, Files Provided to Person 2, Folder Structure, Functions Person 2 Should Call, Future Improvements (+11 more)

### Community 17 - "inference/predict.py"
Cohesion: 0.05
Nodes (46): Predict module for Sentinel-2 Land-Use Classification. Re-exports single patch…, Inference module for model prediction, sliding window tiling, and spatial…, classify_tile(), predict(), preprocess_image(), Any, Tensor, Inference & Tile Classification Module for Sentinel-2 Satellite Imagery.… (+38 more)

### Community 18 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "App.tsx"
Cohesion: 0.15
Nodes (13): fetchAvailableCities(), App(), APP_TABS, resolveInitialPage(), UTILITY_PATHS, Navbar(), NavbarProps, OVERVIEW_DISTRICT (+5 more)

### Community 20 - "utils.py"
Cohesion: 0.12
Nodes (15): download_model_weights_if_missing(), find_sentinel_bands(), get_logger(), get_raster_wgs84_bounds(), process_bands_array(), Any, ndarray, Tensor (+7 more)

### Community 21 - "AboutPage.tsx"
Cohesion: 0.15
Nodes (8): Footer(), FooterProps, SITE_CONFIG, PAGE_TITLES, AboutPage(), AboutPageProps, DataPage(), DataPageProps

### Community 22 - "react"
Cohesion: 0.12
Nodes (4): RegionSelectorProps, YearRangePillsProps, RegionYearState, react

### Community 23 - "download_dynamic_world.py"
Cohesion: 0.36
Nodes (9): compare_methods(), compute_statistics(), download_dynamic_world_data(), generate_disagreement_png(), ndarray, Generates a map highlighting pixels where mode != probability., verify_grid_alignment(), merge_tiles() (+1 more)

### Community 24 - "test_overview_performance.py"
Cohesion: 0.18
Nodes (7): _FakeQueryBuilder, _FakeSupabaseClient, _make_sample_classes(), fixture, _reset_esri_caches(), test_overview_summary_cold_start_single_bulk_query_and_memory_cache(), test_overview_summary_falls_back_only_for_missing_district_year()

### Community 25 - "GPT & Open Source Models Adapter"
Cohesion: 0.15
Nodes (12): Anti-Patterns, Context Optimization, Function Calling, General Guidance, GPT Models, GPT & Open Source Models Adapter, Local Deployment, Model Selection (+4 more)

### Community 26 - "DynamicWorldService"
Cohesion: 0.07
Nodes (52): CityPath, get_boundary(), get_change_stats(), get_cities(), get_layers(), get_metadata(), get_overview_summary(), get_preview() (+44 more)

### Community 27 - "Section 1: Remote Sensing & Satellite Imagery Fundamentals"
Cohesion: 0.18
Nodes (11): Q10: What is the difference between Spatial Reference System (SRS) and Coordinate Reference System (CRS)?, Q1: What is the Sentinel-2 satellite mission, and what are its key characteristics?, Q2: Which 4 raw spectral bands are extracted from Sentinel-2 in this project, and what are their spatial resolutions?, Q3: What is the Normalized Difference Vegetation Index (NDVI), how is it calculated, and what do its values signify?, Q4: What is the Normalized Difference Water Index (NDWI), and why is it included?, Q5: What is the Sentinel-2 Scene Classification Layer (SCL)?, Q6: Why is digital reflectance normalized by dividing by 10,000?, Q7: What spatial resolution is used in this project? (+3 more)

### Community 28 - "Section 2: Deep Learning & ResNet50 Architecture"
Cohesion: 0.18
Nodes (11): Q11: Why is ResNet50 preferred over a custom CNN from scratch?, Q12: Standard ResNet50 accepts 3 input channels (RGB). How was it modified to accept 6 channels?, Q13: How were weights initialized for the 3 newly added channels (NIR, NDVI, NDWI)?, Q14: Which layers of ResNet50 were frozen during fine-tuning?, Q15: What is the input shape and output shape of our ResNet50 model?, Q16: Why is Softmax applied to the model outputs during inference?, Q17: What loss function and optimizer were used during training?, Q18: What learning rate scheduler was applied? (+3 more)

### Community 29 - "Gemini Adapter"
Cohesion: 0.20
Nodes (9): Anti-Patterns, Code Execution, Context Loading Pattern, Context Window Optimization, Flash vs Pro, Gemini Adapter, Grounding, Integration with .gemini/ (+1 more)

### Community 30 - "ErrorBoundary"
Cohesion: 0.20
Nodes (3): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState

### Community 32 - "Colab 10-City Batch Processing Guide"
Cohesion: 0.20
Nodes (9): Checking Progress, City Processing Logic and Resilience, Colab 10-City Batch Processing Guide, How to Open and Run the Notebook, Project Architecture & Responsibility, Required Google Drive Setup, Security Precaution, Serving to the Dashboard (+1 more)

### Community 33 - "2. Detailed Misclassification Case Studies"
Cohesion: 0.20
Nodes (9): 1. Class-wise Performance Breakdown, 2. Detailed Misclassification Case Studies, 3. Mitigation Strategies & Future Improvements, Case Study 1: Pasture vs. HerbaceousVegetation, Case Study 2: AnnualCrop vs. PermanentCrop, Case Study 3: Highway vs. Industrial vs. Residential, Case Study 4: River vs. SeaLake, Error Analysis & Misclassification Report (+1 more)

### Community 34 - "Section 6: Web Backend, FastAPI, & API Design"
Cohesion: 0.20
Nodes (10): Q37: Why was FastAPI chosen for the backend framework?, Q38: How does FastAPI's `lifespan` context manager optimize model inference?, Q39: What is CORS, and why is `CORSMiddleware` configured?, Q40: What HTTP status codes are returned by our API?, Q41: How does the API stream file uploads without filling server memory?, Q42: What is the function of `torch.inference_mode()`?, Q43: How does automatic model downloading work if `resnet50_best.pt` is missing?, Q44: What endpoints are exposed in `api.py`? (+2 more)

### Community 35 - "Any"
Cohesion: 0.15
Nodes (9): Any, ndarray, Aggregates real 2019-2025 statewide Tamil Nadu land cover metrics across the 38…, Fetch esri_year_stats rows for multiple locations and years in a single bulk…, Loads and caches the shapely polygon boundary geometry (EPSG:4326)., Reads clipped raster window, reprojects polygon to tile CRS, and masks outside…, Computes land cover class stats. Supports single tile and dual tile (43P + 44P)…, Computes pixel-wise change statistics, real 9x9 transition matrix, and top… (+1 more)

### Community 36 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 37 - "dynamicWorldClasses.ts"
Cohesion: 0.22
Nodes (5): CHANGE_CLASSES, DW_NODATA_VALUE, DW_TRANSITION_NODATA, DWClassInfo, DYNAMIC_WORLD_CLASSES

### Community 38 - "generate_esri_timelapse_gif.py"
Cohesion: 0.28
Nodes (8): colorize_raster(), create_timelapse_gif(), find_tile_file(), ndarray, Generates an animated GIF visual resource from the 2019-2025 Esri 10m Land…, Finds the GeoTIFF file for a given tile and year., Converts 2D integer class array to 3D RGB uint8 image., Creates an animated GIF of the 2019-2025 land cover progression. Fast overview…

### Community 39 - "Claude Adapter"
Cohesion: 0.25
Nodes (7): Anti-Patterns, Artifacts Mode, Claude Adapter, Context Optimization, Effort Levels, Extended Thinking Mode, File Conventions

### Community 40 - "ChangeAnalyticsPage.tsx"
Cohesion: 0.32
Nodes (5): ChangeAnalyticsPage(), TrendAreaTable(), TrendAreaTableProps, TrendSeriesChart(), TrendSeriesChartProps

### Community 41 - "Master Viva Preparation Guide: 50 Questions & Answers"
Cohesion: 0.25
Nodes (7): Master Viva Preparation Guide: 50 Questions & Answers, Q46: How is modularity maintained across the 3 project team members?, Q47: What design patterns were followed to avoid code duplication?, Q48: How are unit and integration tests structured in `test_api.py`?, Q49: What is PEP 8 compliance, and how is it enforced?, Q50: How can this project be scaled in production?, Section 7: Software Engineering & Project Integration

### Community 42 - "Section 5: Change Detection & Area Statistics"
Cohesion: 0.29
Nodes (7): Q31: What is post-classification change detection?, Q32: How does the system handle two annual GeoTIFFs with different dimensions or CRS?, Q33: How is a pixel-wise transition code calculated?, Q34: How is land cover area calculated in Hectares (ha)?, Q35: How is net percentage change calculated for a land cover class?, Q36: What output files are generated by the Change Detection module?, Section 5: Change Detection & Area Statistics

### Community 43 - "Supabase Free Keepalive Workflow"
Cohesion: 0.29
Nodes (6): 1. Create the GitHub Repository, 2. Configure Supabase Project URLs and Keys, 3. Add GitHub Repository Secrets, 4. Manually Execute the Workflow, 5. Verify Scheduled Executions, Supabase Free Keepalive Workflow

### Community 44 - "DownloadActionPanel.tsx"
Cohesion: 0.40
Nodes (4): ActionState, DownloadActionPanel(), DownloadActionPanelProps, ReportsExportPage()

### Community 45 - "TypographyGuide.tsx"
Cohesion: 0.40
Nodes (4): CATEGORIES, FONT_LINKS, MONO_FONTS, TypographyGuide()

### Community 46 - "vercel.json"
Cohesion: 0.33
Nodes (5): buildCommand, headers, outputDirectory, rewrites, $schema

### Community 47 - "Section 3: Data Preprocessing & Memory Optimization"
Cohesion: 0.33
Nodes (6): Q21: What is windowed reading in `rasterio`, and why is it critical?, Q22: How does Python's `yield` generator optimize memory during patch extraction?, Q23: How does `validate_bands()` verify satellite image integrity?, Q24: What dataset splitting strategy was used?, Q25: Why were spatial data augmentations chosen over color jittering?, Section 3: Data Preprocessing & Memory Optimization

### Community 48 - "Section 4: Spatial Tiling, Stitching, & Georeferencing"
Cohesion: 0.33
Nodes (6): Q26: What is spatial stitching in remote sensing inference?, Q27: How are overlapping patches handled during tile stitching?, Q28: What spatial metadata must be preserved when exporting a prediction GeoTIFF?, Q29: What is an Affine Transform matrix in `rasterio`?, Q30: How are prediction GeoTIFFs converted to WGS84 (EPSG:4326) bounding boxes for web maps?, Section 4: Spatial Tiling, Stitching, & Georeferencing

### Community 49 - "seed_supabase.py"
Cohesion: 0.53
Nodes (5): load_change_stats(), load_regions(), load_year_stats(), main(), Seed Supabase with Esri region hierarchy and cached year-stats JSONs. Does NOT…

### Community 50 - "run_real_pipeline.py"
Cohesion: 0.16
Nodes (18): colorize_class_map(), Converts a 1-band class index TIF into a colored PNG for the frontend., run_pipeline(), _download_http_with_retries(), download_region_recursive(), download_sentinel2_gee(), initialize_gee(), mask_s2_clouds_gee() (+10 more)

### Community 51 - "upload_to_r2.py"
Cohesion: 0.50
Nodes (4): collect_assets(), main(), Upload GeoTIFFs, preview PNGs, city results, and visual timelapse assets to…, Collect (local_path, r2_key) pairs without deleting any local files.

### Community 52 - "setup_search.sh script"
Cohesion: 0.70
Nodes (4): check_fd(), check_ripgrep(), setup_search.sh script, suggest_install()

### Community 53 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 54 - "pdfReport.ts"
Cohesion: 0.67
Nodes (3): buildPdfReportBlob(), escapePdfText(), PdfReportInput

### Community 77 - "detect_change_dynamic_world.py"
Cohesion: 0.18
Nodes (11): detect_change(), strict_grid_validation(), generate_validation_png(), Generates a color-mapped PNG for visual validation. Nodata (255) becomes…, 6 -> 6 should produce binary change 0., 4 -> 6 should produce binary change 1 and transition 406., 255 -> 6 should produce binary change 255 and transition 65535., test_binary_change_changed() (+3 more)

### Community 79 - "EsriService"
Cohesion: 0.20
Nodes (7): _r2_preview_exists(), Verify whether the preview PNG exists in R2, with a short-TTL in-memory cache., Resolves to the Cloudflare R2 RGBA PNG preview URL when R2 is configured., EsriService, Private Backblaze B2 buckets use presigned GetObject URLs (no public base URL)., test_b2_client_initializes_without_r2_account_id(), test_b2_presigned_url_generation_and_routes()

### Community 80 - "test_dual_tile_district_returns_none_url_and_merges_rasters"
Cohesion: 0.32
Nodes (7): Single-tile district (Chennai -> ['44P']) returns direct R2 URL when R2 is…, Dual-tile district (Dharmapuri -> ['43P', '44P']) returns None for URL and…, Dual-tile preview renders non-empty pixels from both 43P (west) and 44P (east)…, test_dual_tile_district_returns_none_url_and_merges_rasters(), test_dual_tile_preview_covers_both_tiles(), test_single_tile_district_returns_r2_url(), _write_synthetic_geotiff()

### Community 81 - "security.py"
Cohesion: 0.24
Nodes (10): _bool_env(), _classify_tier(), extract_client_ip(), _int_env(), Security utilities and ASGI middleware for GeoSat Intelligence API: -…, Extract client IP safely behind a reverse proxy (e.g. Render). Uses the…, Headers, Receive (+2 more)

### Community 82 - "main.py"
Cohesion: 0.22
Nodes (10): FastAPI, lifespan(), GeoSat Intelligence — FastAPI Backend (API-Only Production Entrypoint). Serves…, Lifespan context manager that handles server startup and shutdown tasks., is_api_docs_enabled(), parse_allowed_origins(), Determine whether Swagger UI, ReDoc, and OpenAPI schema should be exposed.…, Parse ALLOWED_ORIGINS into (origins, allow_credentials). - In development,… (+2 more)

### Community 83 - "api_root"
Cohesion: 0.40
Nodes (5): api_root(), health_check(), get, Health check endpoint to verify backend status., API-only root metadata endpoint.

### Community 84 - "test_preview_fallback.py"
Cohesion: 0.18
Nodes (6): Exception, Raised when streamed request body exceeds MAX_REQUEST_BODY_BYTES., _RequestBodyTooLarge, clear_preview_cache(), fixture, test_r2_s3_head_object_hit_and_miss()

### Community 85 - "InMemoryRateLimiter"
Cohesion: 0.33
Nodes (3): InMemoryRateLimiter, Check whether a request is allowed. Returns (allowed, limit, remaining,…, Thread-safe sliding-window per-IP rate limiter.

### Community 86 - "backend_config.py"
Cohesion: 0.22
Nodes (6): get_esri_raster_filename(), Configuration settings for the Person 2 Backend & Inference module. Centrally…, Returns canonical Esri 10m LULC GeoTIFF filename for a tile and year., download_sentinel_tile(), get_cdse_token(), Generates an OAuth2 token from the Copernicus Data Space Ecosystem

### Community 88 - ".get_hierarchy"
Cohesion: 0.36
Nodes (5): list_hierarchy(), main(), CLI Pipeline to process, clip, and analyze Esri 10m LULC data for Regional,…, run_change(), run_stats()

### Community 89 - "SecurityMiddleware"
Cohesion: 0.50
Nodes (3): ASGIApp, Pure ASGI middleware enforcing: - URL length bounds (414) - Streaming request…, SecurityMiddleware

### Community 90 - "process_dynamic_world_cities.py"
Cohesion: 0.70
Nodes (4): load_city_config(), main(), process_city(), valid_mode_raster()

## Knowledge Gaps
- **316 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EsriService` connect `EsriService` to `api/esri.py`, `.resolve_layer_path`, `Any`, `test_dual_tile_district_returns_none_url_and_merges_rasters`, `backend_config.py`, `.get_hierarchy`, `test_overview_performance.py`, `DynamicWorldService`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `DynamicWorldService` connect `DynamicWorldService` to `test_dual_tile_district_returns_none_url_and_merges_rasters`, `.resolve_layer_path`, `backend_config.py`, `EsriService`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `plugins`, `client.ts`, `ChangeAnalyticsPage.tsx`, `DynamicWorldDashboard.tsx`, `DownloadActionPanel.tsx`, `TypographyGuide.tsx`, `App.tsx`, `AboutPage.tsx`, `PrivacyPage.tsx`, `ErrorBoundary`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `EsriService` (e.g. with `get_boundary()` and `get_overview_summary()`) actually correct?**
  _`EsriService` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `DynamicWorldService` (e.g. with `get_change_stats()` and `get_cities()`) actually correct?**
  _`DynamicWorldService` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api/esri.py` be split into smaller, more focused modules?**
  _Cohesion score 0.14022988505747128 - nodes in this community are weakly interconnected._