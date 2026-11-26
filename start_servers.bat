@echo off
echo ========================================================
echo   Launching GeoSat Intelligence (Backend + Frontend)
echo ========================================================

start "GeoSat Backend (Port 8000)" cmd /k "python run_backend.py"
start "GeoSat Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting in separate windows:
echo - Frontend: http://localhost:5173
echo - Backend:  http://127.0.0.1:8000
echo.
pause
