# Graph Report - geo_sat_project  (2026-11-27)

## Corpus Check
- 128 files · ~102,686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1078 nodes · 1650 edges · 79 communities (68 shown, 11 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 68 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `79472818`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- EsriService
- DynamicWorldService
- backend_client.py
- backend_config.py
- dynamicWorldClient.ts
- client.ts
- devDependencies
- test_dynamic_world_api.py
- dependencies
- compilerOptions
- Geo-Satellite Imagery Project
- test_api.py
- DynamicWorldDashboard.tsx
- 🛰️ GeoSat Intelligence — Complete Project Guide
- 🛰️ GeoSat Intelligence — Complete Project Guide
- compilerOptions
- MASTER_WALKTHROUGH.md
- extract_patches
- components.json
- App.tsx
- TileStitcher
- AboutPage.tsx
- react
- compute_change_detection
- test_overview_performance.py
- GPT & Open Source Models Adapter
- run_real_pipeline.py
- Section 1: Remote Sensing & Satellite Imagery Fundamentals
- Section 2: Deep Learning & ResNet50 Architecture
- Gemini Adapter
- ErrorBoundary
- navigation-menu.tsx
- Colab 10-City Batch Processing Guide
- 2. Detailed Misclassification Case Studies
- Section 6: Web Backend, FastAPI, & API Design
- inference/predict.py
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
- OverviewDashboard.tsx
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
- compute_landcover_area_stats
- test_utils_and_app_import_without_torch

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
- `predict_land_use()` --calls--> `predict()`  [INFERRED]
  geo_sat project/app/services/backend_client.py → geo_sat project/src/inference/predict.py
- `classify_satellite_tile()` --calls--> `classify_tile()`  [INFERRED]
  geo_sat project/app/services/backend_client.py → geo_sat project/src/inference/predict.py
- `DynamicWorldService` --uses--> `EsriService`  [INFERRED]
  geo_sat project/app/services/dynamic_world_service.py → geo_sat project/app/services/esri_service.py
- `test_dual_tile_district_returns_none_url_and_merges_rasters()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/tests/test_dual_tile.py → geo_sat project/app/services/esri_service.py
- `test_dual_tile_preview_covers_both_tiles()` --uses--> `EsriService`  [INFERRED]
  geo_sat project/tests/test_dual_tile.py → geo_sat project/app/services/esri_service.py

## Import Cycles
- None detected.

## Communities (79 total, 11 thin omitted)

### Community 0 - "EsriService"
Cohesion: 0.05
Nodes (55): get_boundary(), get_overview_summary(), _r2_preview_exists(), Verify whether the preview PNG exists in R2, with a short-TTL in-memory cache., Returns the GeoJSON polygon boundary for the requested city or district., Returns real statewide 2019-2025 Tamil Nadu snapshot, top movers, and config…, get_change_stats(), get_hierarchy() (+47 more)

### Community 1 - "DynamicWorldService"
Cohesion: 0.06
Nodes (60): get_change_stats(), get_cities(), get_layers(), get_metadata(), get_preview(), get_raster(), get_stats(), get_transitions() (+52 more)

### Community 2 - "backend_client.py"
Cohesion: 0.11
Nodes (29): ChangeDetectionResponse, classify_satellite_tile(), get_available_cities(), get_available_layers(), get_demo_data(), get_latest_valid_city_dir(), get_stats_summary(), health_check() (+21 more)

### Community 3 - "backend_config.py"
Cohesion: 0.05
Nodes (58): get_esri_raster_filename(), Configuration settings for the Person 2 Backend & Inference module. Centrally…, Returns canonical Esri 10m LULC GeoTIFF filename for a tile and year., detect_change(), strict_grid_validation(), compare_methods(), compute_statistics(), download_dynamic_world_data() (+50 more)

### Community 4 - "dynamicWorldClient.ts"
Cohesion: 0.08
Nodes (33): fetchChangeAndTransitions(), fetchRegionsWithClasses(), fetchYearlyStatsSeries(), seriesCache, transitionsCache, api, API_BASE, cachedGet() (+25 more)

### Community 5 - "client.ts"
Cohesion: 0.09
Nodes (31): api, API_BASE, fetchEsriChange(), fetchEsriHierarchy(), fetchEsriStats(), fetchEsriVisualResource(), predictPatch(), OverviewSystemInfo (+23 more)

### Community 6 - "devDependencies"
Cohesion: 0.06
Nodes (32): autoprefixer, devDependencies, autoprefixer, oxlint, postcss, tailwindcss, @types/leaflet, @types/node (+24 more)

### Community 7 - "test_dynamic_world_api.py"
Cohesion: 0.07
Nodes (11): FastAPI, api_root(), health_check(), lifespan(), get, GeoSat Intelligence — FastAPI Backend (API-Only Production Entrypoint). Serves…, Lifespan context manager that handles server startup and shutdown tasks., API-only root metadata endpoint. (+3 more)

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

### Community 17 - "extract_patches"
Cohesion: 0.08
Nodes (31): apply_scl_cloud_mask(), extract_patches(), load_bands(), load_scl_band(), normalize_and_stack(), Any, ndarray, Data Preprocessing module for Sentinel-2 satellite images. Memory-optimized for… (+23 more)

### Community 18 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 19 - "App.tsx"
Cohesion: 0.16
Nodes (13): checkHealth(), fetchAvailableCities(), App(), APP_TABS, resolveInitialPage(), UTILITY_PATHS, Navbar(), NavbarProps (+5 more)

### Community 20 - "TileStitcher"
Cohesion: 0.16
Nodes (12): Inference module for model prediction, sliding window tiling, and spatial…, Any, ndarray, Stitching and Georeferencing Module for Satellite Image Inference. Reconstructs…, Writes the prediction class map (and optionally confidence map) to a…, Convenience function to stitch a list of patch predictions into a GeoTIFF.…, Reconstructs patch predictions into full-extent GeoTIFF maps. Supports majority…, Args: meta (Dict[str, Any]): Raster metadata dictionary containing 'width',… (+4 more)

### Community 21 - "AboutPage.tsx"
Cohesion: 0.15
Nodes (8): Footer(), FooterProps, SITE_CONFIG, PAGE_TITLES, AboutPage(), AboutPageProps, DataPage(), DataPageProps

### Community 22 - "react"
Cohesion: 0.12
Nodes (4): RegionSelectorProps, YearRangePillsProps, RegionYearState, react

### Community 23 - "compute_change_detection"
Cohesion: 0.20
Nodes (14): analyze_change_detection(), Multi-temporal land cover change detection endpoint., Change Detection - Difference Map Module Wrapper. Exposes diff map functions…, Change Detection Module Top-level Package., align_and_load_rasters(), compute_change_detection(), export_change_geotiff(), Any (+6 more)

### Community 24 - "test_overview_performance.py"
Cohesion: 0.18
Nodes (7): _FakeQueryBuilder, _FakeSupabaseClient, _make_sample_classes(), fixture, _reset_esri_caches(), test_overview_summary_cold_start_single_bulk_query_and_memory_cache(), test_overview_summary_falls_back_only_for_missing_district_year()

### Community 25 - "GPT & Open Source Models Adapter"
Cohesion: 0.15
Nodes (12): Anti-Patterns, Context Optimization, Function Calling, General Guidance, GPT Models, GPT & Open Source Models Adapter, Local Deployment, Model Selection (+4 more)

### Community 26 - "run_real_pipeline.py"
Cohesion: 0.16
Nodes (19): Predict module for Sentinel-2 Land-Use Classification. Re-exports single patch…, colorize_class_map(), Converts a 1-band class index TIF into a colored PNG for the frontend., run_pipeline(), export_area_stats_csv(), Exports land cover area statistics DataFrame to CSV. Args: df_stats…, classify_tile(), load_inference_model() (+11 more)

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

### Community 35 - "inference/predict.py"
Cohesion: 0.27
Nodes (6): Inference & Tile Classification Module for Sentinel-2 Satellite Imagery.…, BaselineCNN, get_model(), get_resnet50(), Loads a pretrained ResNet50 model, modifies the input layer to accept 6…, A simple baseline Convolutional Neural Network for 6-channel satellite imagery.

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

### Community 50 - "OverviewDashboard.tsx"
Cohesion: 0.40
Nodes (3): OVERVIEW_DISTRICT, OverviewDashboard(), OverviewDashboardProps

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

### Community 77 - "compute_landcover_area_stats"
Cohesion: 0.18
Nodes (15): Affine, CRS, DataFrame, Figure, Change Detection - Statistics Module Wrapper. Exposes area statistics…, calculate_pixel_area(), compute_landcover_area_stats(), plot_area_comparison() (+7 more)

## Knowledge Gaps
- **316 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `EsriService` connect `EsriService` to `test_overview_performance.py`, `DynamicWorldService`, `backend_config.py`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `plugins`, `client.ts`, `ChangeAnalyticsPage.tsx`, `DynamicWorldDashboard.tsx`, `DownloadActionPanel.tsx`, `TypographyGuide.tsx`, `OverviewDashboard.tsx`, `App.tsx`, `AboutPage.tsx`, `ErrorBoundary`, `navigation-menu.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `DynamicWorldService` connect `DynamicWorldService` to `EsriService`, `backend_config.py`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 26 inferred relationships involving `EsriService` (e.g. with `get_boundary()` and `get_overview_summary()`) actually correct?**
  _`EsriService` has 26 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `DynamicWorldService` (e.g. with `get_change_stats()` and `get_cities()`) actually correct?**
  _`DynamicWorldService` has 20 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `EsriService` be split into smaller, more focused modules?**
  _Cohesion score 0.05193319606497369 - nodes in this community are weakly interconnected._