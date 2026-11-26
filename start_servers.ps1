# Launches both GeoSat Backend and Frontend servers in separate PowerShell processes
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   Launching GeoSat Intelligence (Backend + Frontend)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Start Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python run_backend.py"

# Start Frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "Both servers launched in background processes:" -ForegroundColor Green
Write-Host "  - Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "  - Backend:  http://127.0.0.1:8000" -ForegroundColor Yellow
Write-Host "  - Docs:     http://127.0.0.1:8000/docs" -ForegroundColor Yellow
