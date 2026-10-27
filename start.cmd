@echo off
setlocal
set "APP=%~dp0dist-single\index.html"

if exist "%APP%" (
  start "" "%APP%"
  exit /b 0
)

echo BlackBox is not built yet.
echo Run: npm install ^&^& npm run build:single
echo.
pause
