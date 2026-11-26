FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    GDAL_CACHEMAX=64 \
    GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR \
    CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif,.tiff \
    VSI_CACHE=TRUE \
    VSI_CACHE_SIZE=16777216 \
    CPL_VSIL_CURL_USE_HEAD=NO

WORKDIR /app

# System dependencies for rasterio / GDAL / shapely
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    gdal-bin \
    libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-prod.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-prod.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
