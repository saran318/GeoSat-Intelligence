"""
Root entrypoint to run the GeoSat FastAPI backend from the root directory.
"""
import os
import sys

# Resolve paths
root_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(root_dir, "geo_sat project")

if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Switch working directory so relative paths in backend resolve cleanly
os.chdir(backend_dir)

if __name__ == "__main__":
    import uvicorn
    print(f"🚀 Starting GeoSat Backend from: {backend_dir}")
    print("📍 URL: http://127.0.0.1:8000")
    print("📚 Swagger Docs: http://127.0.0.1:8000/docs")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
