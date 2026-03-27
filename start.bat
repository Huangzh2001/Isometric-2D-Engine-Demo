@echo off
cd /d "%~dp0"
if not exist "%~dp0logs" mkdir "%~dp0logs"
set LOGFILE=%~dp0logs\server-main.log
call :pick_port
if errorlevel 1 goto :port_failed
start "Isometric Room Main Server" /min cmd /c ""%~dp0server\run_server.bat" %PORT% main"
call :wait_ready
if errorlevel 1 goto :server_failed
start "" "http://127.0.0.1:%PORT%/index.html?v=20260323P-ui-button-iconfix"
exit /b

:pick_port
for /f %%p in ('powershell -NoProfile -Command "$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,0); $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop(); Write-Output $port"') do set PORT=%%p
if "%PORT%"=="" exit /b 1
exit /b 0

:wait_ready
for /l %%i in (1,1,30) do (
  timeout /t 1 >nul
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:%PORT%/api/health -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 exit /b 0
)
exit /b 1

:port_failed
echo.
echo [ERROR] Could not allocate a local port.
pause
exit /b 1

:server_failed
echo.
echo [ERROR] Local server did not start correctly.
echo Open logs\server-main.log in the project folder to see the actual error.
if exist "%LOGFILE%" start "" notepad "%LOGFILE%"
pause
exit /b 1
