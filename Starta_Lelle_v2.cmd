@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Lelle Agent v2

color 0b

:: Sökväg till v2-projektet (hårdkodad)
set "AGENT_BASE=H:\LM_Studio_projekt\local-code-assistant-lelle"
pushd "!AGENT_BASE!"

cls
echo.
echo  ################################################################################
echo  #          🤖  LELLE AGENT v2   —   Native REST API + MCP                     #
echo  ################################################################################
echo.

:: Hantera projektmapp som argument
set "INPUT_DIR=%~f1"
if not "!INPUT_DIR!"=="" (
    if exist "!INPUT_DIR!\" (
        set "AGENT_CWD=!INPUT_DIR!"
        powershell -Command "write-host '  [+] Projektmapp: ' -NoNewline -ForegroundColor Green; write-host '!INPUT_DIR!' -ForegroundColor Cyan"
    )
) else (
    echo   [i] Ingen mapp angiven. Vald via dashboarden.
)

echo.
echo   [!] Rensar gamla processer (port 3001, 5174)...
FOR /F "tokens=5" %%a IN ('netstat -aon ^| find ":3001" ^| find "LISTENING"') DO taskkill /F /PID %%a >nul 2>nul
FOR /F "tokens=5" %%a IN ('netstat -aon ^| find ":5174" ^| find "LISTENING"') DO taskkill /F /PID %%a >nul 2>nul

:: Installera backend om node_modules saknas
if not exist "!AGENT_BASE!\node_modules" (
    echo   [⬇] Installerar backend-paket (en gång)...
    call npm install --prefix "!AGENT_BASE!"
)

:: Installera frontend om node_modules saknas
if not exist "!AGENT_BASE!\frontend\node_modules" (
    echo   [⬇] Installerar frontend-paket (en gång)...
    call npm install --prefix "!AGENT_BASE!\frontend"
)

echo.
echo   [🚀] Öppnar dashboarden...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5174"

echo   [⚡] Startar Vite-frontend (port 5174)...
start /min cmd /c "title Vite v2 && cd /d "!AGENT_BASE!\frontend" && npx vite --port 5174"

echo   [⚡] Startar Agent Motor (port 3001)...
echo.
echo   Tips: Skriv 'mcp' for att se MCP-status, 'clear' for att rensa historik.
echo.

call npx tsx server/index.ts

exit /b
