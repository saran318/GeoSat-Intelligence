# 🛰️ GeoSat Intelligence — Complete Project Guide

> **Satellite Land-Use Classification, Multi-Temporal Monitoring & Change Analytics**  
> **Region Focus:** Tamil Nadu & Southern Indian Peninsula  
> **Spatial Data:** Sentinel-2 L2A · Esri 10m Annual LULC (2019–2025) · EuroSAT ResNet-50

---

## 📌 1. Project Overview

**GeoSat Intelligence** is an end-to-end geospatial artificial intelligence platform designed to monitor environmental dynamics, urban sprawl, agricultural shifts, and water body variations over time. 

The platform integrates two core analytical engines:
1. **Regional Esri 10m Time-Series Engine (2019–2025)**: Synthesizes high-resolution Sentinel-2 land cover rasters across all 38 districts and major urban footprints of Tamil Nadu, featuring dual-year split curtain swipe maps, binary categorical change detection, and directional class flux matrices.
2. **ResNet-50 Neural Inference Engine**: A deep learning classification model trained on EuroSAT multi-spectral bands capable of patch-level inference and tile-level sliding-window classification.

---

## 🏗️ 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES & INGESTION                        │
├──────────────────────────────────┬─────────────────────────────────────┤
│   Esri 10m LULC (2019–2025)      │       EuroSAT Sentinel-2 Patches    │
│   Tile 43P (TN-1) & 44P (TN-2)   │       64×64 RGB / Multi-Spectral    │
└────────────────┬─────────────────┴──────────────────┬──────────────────┘
                 │                                    │
                 ▼                                    ▼
┌──────────────────────────────────┬─────────────────────────────────────┐
│    ESRI SERVICE & WINDOW ENGINE  │    PYTORCH RESNET-50 CLASSIFIER     │
│    - Windowed slicing (Rasterio) │    - 10-Class EuroSAT Architecture  │
│    - Dynamic CRS Re-projection   │    - Pre-trained Weights Cached     │
│    - On-the-fly RGBA PNG Overlays│    - Tile Sliding-Window Classifier │
│    - Pixel Flux & Transition     │    - Real-time Patch Inference      │
└────────────────┬─────────────────┴──────────────────┬──────────────────┘
                 │                                    │
                 └─────────────────┬──────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   FASTAPI REST BACKEND (Port 8000)                     │
│   /api/dynamic-world/*    /api/esri/*    /api/predict    /health       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │  (Vite Reverse Proxy)
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 REACT 19 + VITE FRONTEND (Port 5173)                   │
│   - Interactive Leaflet Canvas with Vertical Curtain Swipe Slider      │
│   - 4-Card Layer Mode (Land Cover, Swipe, Binary Change, Transition)   │
│   - Exclusive Tamil Nadu Target Regions (Chennai, Coimbatore, etc.)    │
│   - Side-by-Side Class Distribution Tables & Floating Legend           │
│   - Neural Inference Lab & Patch Uploader (ResNet-50)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ 3. Backend Architecture (`geo_sat project/`)

The backend is built with **Python 3.11+** and **FastAPI**, engineered for high-throughput spatial telemetry without in-memory raster bloat.

### Technology Stack
- **Web Framework**: FastAPI, Uvicorn, Pydantic v2
- **Geospatial Processing**: Rasterio, GDAL, Shapely, PyProj
- **Deep Learning**: PyTorch, Torchvision (ResNet-50)
- **Image Synthesis**: Pillow (PIL), NumPy, Matplotlib

### Core Modules & Services

| File | Purpose |
| :--- | :--- |
| **`app/main.py`** | Application lifespan, CORS middleware, static file mounting, router registration. |
| **`backend_config.py`** | Central configuration for models, directories, Esri classes, colors, and valid years. |
| **`app/services/esri_service.py`** | **The Core Spatial Engine**: Performs sub-second windowed raster reads (`rasterio.windows.from_bounds`), decimation, class area calculations, and dynamic RGBA PNG map overlay generation. |
| **`app/services/dynamic_world_service.py`** | Adapter connecting existing frontend telemetry to the Esri Tamil Nadu spatial engine. |
| **`app/api/esri.py`** | Dedicated endpoints for hierarchy, tile metadata, and animated visual resources. |
| **`app/api/dynamic_world.py`** | Endpoints for cities, layers, metadata, raster previews, and change stats. |
| **`predict.py`** | PyTorch ResNet-50 inference pipeline for EuroSAT land-use patches. |
| **`src/change_detection/diff_maps.py`** | Pixel-wise categorical diff map generator. |
| **`scripts/generate_esri_timelapse_gif.py`** | Fast pyramid overview script generating animated GIF visual resources. |
| **`scripts/process_esri_hierarchy.py`** | Standalone CLI tool for future offline batch processing and full 10m clipping. |

---

## 🎨 4. Frontend Architecture (`frontend/`)

The frontend is a modern, responsive Single-Page Application (SPA) built with **React 19**, **TypeScript**, and **Tailwind CSS**.

### Technology Stack
- **Build Tool**: Vite 8.2 (Fast HMR & Optimized Bundler)
- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4, Geist Font, Lucide Icons
- **GIS Mapping**: Leaflet 1.9, React-Leaflet
- **Motion & Charts**: Framer Motion, Recharts

### Frontend Component Structure

```
frontend/src/
├── api/
│   ├── client.ts                 # Axios instance & general API calls
│   ├── dynamicWorldClient.ts     # Dedicated client for map layers & previews
│   └── types.ts                  # TypeScript response schemas
├── config/
│   └── dynamicWorldClasses.ts    # Official Esri 10-class taxonomy & hex colors
└── components/
    ├── common/Navbar.tsx         # Sticky header with engine status badge & dark mode
    ├── dynamic_world/
    │   ├── DynamicWorldDashboard.tsx  # Main dashboard layout (sidebar + map + stats)
    │   ├── DynamicWorldControls.tsx   # 4-card interactive Layer Mode with dropdowns
    │   ├── DynamicWorldMap.tsx        # Leaflet canvas with custom Chevrons swipe handle
    │   ├── DynamicWorldLegend.tsx     # Floating collapsible 10-class legend
    │   └── DynamicWorldStats.tsx      # Dual-year comparative distribution tables
    ├── map/CompareSwipeMap.tsx        # Standalone comparison map studio
    ├── inference/PatchUploader.tsx    # Drag-and-drop satellite patch classification
    └── esri/EsriLandCoverDashboard.tsx # Multi-scale Regional/State/District/City dashboard
```

---

## 🗺️ 5. Dataset Specifications (`TN-1` & `TN-2`)

The platform processes high-resolution **Esri 10m Annual Land Cover (Sentinel-2)** data:

### Tile Grid Coverage

| Attribute | Tile 43P (`TN-1`) | Tile 44P (`TN-2`) |
| :--- | :--- | :--- |
| **UTM Zone & CRS** | UTM 43N (`EPSG:32643`) | UTM 44N (`EPSG:32644`) |
| **Raster Resolution** | 10.0m Ground Sampling Distance (GSD) | 10.0m Ground Sampling Distance (GSD) |
| **Raster Dimensions** | 88,695 rows × 66,148 cols (~5.8 Billion Px) | 88,695 rows × 66,148 cols (~5.8 Billion Px) |
| **WGS84 Envelope** | Longitude: `71.91° E – 78.09° E`<br>Latitude: `7.99° N – 16.02° N` | Longitude: `77.91° E – 84.09° E`<br>Latitude: `7.99° N – 16.02° N` |
| **Years Available** | 2019, 2020, 2021, 2022, 2023, 2024, 2025 | 2019, 2020, 2021, 2022, 2023, 2024, 2025 |
| **Districts Covered** | Coimbatore, Salem, Tiruppur, Erode, Nilgiris, Kerala, South Karnataka | Chennai, Madurai, Tiruchirappalli, Kanchipuram, Vellore, Tirunelveli, Thanjavur |

### Official 10-Class Taxonomy

| ID | Class Name | Hex Code | Visual Swatch | Typical Cover in Tamil Nadu |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Water | `#1A5BAB` | 🟦 | Bay of Bengal, Cauvery Basin, Chembarambakkam, Veeranam |
| **2** | Trees | `#358221` | 🟩 | Western Ghats, Nilgiris Biosphere, Reserve Forests, Anamalai |
| **4** | Flooded veg | `#87D19E` | 🟩 | Pichavaram Mangroves, Pallikaranai Marshland, Paddy Floodplains |
| **5** | Crops | `#FFDB5C` | 🟨 | Thanjavur Delta, Coimbatore Agro-belts, Sugarcane & Paddy |
| **7** | Built Area | `#ED022A` | 🟥 | Chennai Metropolitan Area, Coimbatore, Madurai Urban Cores |
| **8** | Bare ground | `#EDE9E4` | ⬜ | Cleared development plots, dry riverbeds, quarries, sand beaches |
| **9** | Snow/Ice | `#F2FAFF` | 🧊 | None in South India (Atmospheric reference) |
| **10** | Clouds | `#C8C8C8` | ☁️ | Atmospheric cloud mask |
| **11** | Rangeland | `#EECFA8` | 🟫 | Scrublands, semi-arid pastures, Tirunelveli thorn scrub |
| **0** | NoData | `transparent`| ⬛ | Transparent map boundaries |

---

## 🚀 6. How to Run the Project

### Method A: One-Click Launchers (Recommended)
From the root directory:
- **Windows / File Explorer**: Double-click [start_servers.bat](file:///c:/Users/saran/OneDrive/projects/geo_sat_project/start_servers.bat)
- **PowerShell**: Run `.\start_servers.ps1`

*(This automatically starts both the FastAPI backend and Vite frontend in dedicated terminal windows).*

---

### Method B: Manual Commands

#### 1. Backend Server (FastAPI)
Run from root:
```powershell
python run_backend.py
```
*Backend is live at **http://127.0.0.1:8000** (Swagger documentation: **http://127.0.0.1:8000/docs**)*

#### 2. Frontend Server (Vite)
Run from root:
```powershell
cd frontend
npm run dev
```
*Frontend is live at **http://localhost:5173***

---

## 🌐 7. Port Forwarding & Publishing

To share or expose the live application:
- **You ONLY need to forward port `5173`** (using VS Code Port Forwarding, ngrok, Cloudflare Tunnel, etc.).
- The backend at port `8000` is **automatically proxied** through Vite (`vite.config.ts`), so all API requests, raster overlays, and stats resolve securely without opening port `8000` directly.

---

## 📡 8. Core API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `GET /api/dynamic-world/cities` | `GET` | Returns list of available Tamil Nadu cities with available years. |
| `GET /api/dynamic-world/{city}/layers` | `GET` | Returns list of layers (annual, swipe pairs, binary change, transitions). |
| `GET /api/dynamic-world/{city}/metadata/{year}`| `GET` | Returns bounding box `[min_lon, min_lat, max_lon, max_lat]` and CRS. |
| `GET /api/dynamic-world/{city}/preview/{layer}` | `GET` | Generates and streams transparent RGBA PNG overlay for Leaflet map canvas. |
| `GET /api/dynamic-world/{city}/stats/{year}` | `GET` | Computes live pixel count, percentage, and km² area distribution. |
| `GET /api/dynamic-world/{city}/change/{y1}/{y2}/stats` | `GET` | Computes net change percentages and class flux gains/losses. |
| `GET /api/esri/hierarchy` | `GET` | Returns the 4-level catalog (Regions, States, Districts, Cities). |
| `GET /api/esri/visual-resource` | `GET` | Metadata for the 2019–2025 animated timelapse GIF visual resource. |
| `GET /api/esri/visual-resource/gif` | `GET` | Streams the generated 2019–2025 animated GIF directly. |
| `POST /predict` | `POST` | Upload a satellite image patch for ResNet-50 neural classification. |

---

## 🔮 9. Future Roadmap & Extensibility

1. **Full-Resolution Sub-Clipping**:
   When ready for full 10m raster extraction, run:
   ```powershell
   python "geo_sat project/scripts/process_esri_hierarchy.py" --level city --name Chennai --clip
   ```
2. **Administrative Vector Polygons**:
   Integrate district administrative GeoJSON files to mask rasters to official revenue boundaries rather than rectangular bounding boxes.
3. **XYZ Tile Server**:
   Pre-generate map tiles or enable Cloud-Optimized GeoTIFF (COG) HTTP Range Requests for statewide zooming over all of Tamil Nadu simultaneously.
]