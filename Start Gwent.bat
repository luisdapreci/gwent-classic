@echo off
title Gwent local server
cd /d "%~dp0"
set PORT=8000
set URL=http://127.0.0.1:%PORT%/

echo Serving Gwent at %URL%
echo Close this window to stop the server.
echo.

where python >nul 2>nul
if %errorlevel%==0 (
	start "" "%URL%"
	python -m http.server %PORT% --bind 127.0.0.1
	goto :end
)

where npx >nul 2>nul
if %errorlevel%==0 (
	start "" "%URL%"
	npx --yes http-server -a 127.0.0.1 -p %PORT% -c-1
	goto :end
)

echo Neither Python nor Node.js was found. Install one of them and try again.

:end
pause
