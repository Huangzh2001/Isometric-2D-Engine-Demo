@echo off
set "SERVER_DIR=%~dp0"
for %%I in ("%SERVER_DIR%..") do set "PROJECT_ROOT=%%~fI"
cd /d "%PROJECT_ROOT%"
set PORT=%~1
set ROLE=%~2
if "%PORT%"=="" set PORT=8765
if "%ROLE%"=="" set ROLE=server
if not exist "%PROJECT_ROOT%\logs" mkdir "%PROJECT_ROOT%\logs"
set LOGFILE=%PROJECT_ROOT%\logs\server-%ROLE%.log
if exist "%LOGFILE%" del /f /q "%LOGFILE%" >nul 2>nul
where py >nul 2>nul
if not errorlevel 1 goto use_py
where python >nul 2>nul
if not errorlevel 1 goto use_python
(
  echo [ERROR] Python is not installed or not on PATH.
  echo Please install Python 3 and try again.
) > "%LOGFILE%"
exit /b 1

:use_py
py -3 "%SERVER_DIR%local_server.py" %PORT% %ROLE% >> "%LOGFILE%" 2>&1
exit /b %errorlevel%

:use_python
python "%SERVER_DIR%local_server.py" %PORT% %ROLE% >> "%LOGFILE%" 2>&1
exit /b %errorlevel%
