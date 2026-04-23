@echo off
REM acceptance replay includes main camera rotation regression via scenario-runner
cd /d "%~dp0"
call "%~dp0start.bat" "?acceptanceReplay=1"
