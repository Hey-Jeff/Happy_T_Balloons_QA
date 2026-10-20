@echo off
setlocal EnableExtensions
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo FALTA NODE.JS. Instala Node.js 22 o posterior en https://nodejs.org
  pause
  exit /b 1
)
:MENU
cls
echo ================================================
echo   QA02 Happy Times Balloons - Playwright
 echo ================================================
echo 1. Validar plan de pruebas
 echo 2. Mostrar cobertura
 echo 3. Listar pruebas
 echo 4. Probar un caso borrador (requiere app QA)
 echo 5. Probar borradores disponibles (parcial)
 echo 6. Mostrar reporte HTML previo
 echo 7. Instalar dependencias y navegador
 echo 0. Salir
 echo.
set /p OPTION=Escoge una opcion: 
if "%OPTION%"=="1" call npm run qa:validate & goto WAIT
if "%OPTION%"=="2" call npm run qa:coverage & goto WAIT
if "%OPTION%"=="3" call npm run qa:list & goto WAIT
if "%OPTION%"=="4" (
  set /p CASEID=Escribe ID, por ejemplo AUT-001: 
  call npm run test:case -- %CASEID% --try-drafts
  goto WAIT
)
if "%OPTION%"=="5" call npm run test:drafts & goto WAIT
if "%OPTION%"=="6" call npm run report & goto WAIT
if "%OPTION%"=="7" (
  call npm install
  call npx playwright install chromium
  goto WAIT
)
if "%OPTION%"=="0" exit /b 0
goto MENU
:WAIT
echo.
pause
goto MENU
