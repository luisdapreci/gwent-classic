@echo off
title Gwent local server
cd /d "%~dp0"
set PORT=8000
set URL=http://127.0.0.1:%PORT%/

echo Serving Gwent at %URL%
echo Close this window to stop the server.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
	start "" "%URL%"
	py -3 -m http.server %PORT% --bind 127.0.0.1
	goto :end
)

rem Skip the Microsoft Store "python" alias, which only opens the Store
python -c "import sys" >nul 2>nul
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

echo Could not find Python or Node.js (npx).
echo Install Python from https://www.python.org/downloads/ or Node.js from https://nodejs.org/
echo then run this file again.
pause

:end

echo Neither Python nor Node.js was found. Install one of them and try again.

:end
pause
