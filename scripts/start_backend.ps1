$env:PYTHONPATH="backend"
Write-Host "Starting PharmaGuard Backend Engine on http://localhost:8000..." -ForegroundColor Green
.\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
