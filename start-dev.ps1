# Start Backend
Write-Host "Starting Backend..."
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "bot" -NoNewWindow

# Start Frontend
Write-Host "Starting Frontend..."
Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "frontend" -NoNewWindow
