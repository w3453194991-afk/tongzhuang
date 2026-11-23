@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PORT=8765"
set "URL=http://127.0.0.1:%PORT%/index.html"
title 小满童装 · 选款与报价中台

echo.
echo   小满童装 · 选款与报价中台
echo   XIAOMAN KIDS · 款式 / 尺码 / 报价 / 资料包
echo   ----------------------------------------

rem 1) 服务已经在跑：直接开页面
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo   本地服务已在运行，直接打开页面...
  start "" "%URL%"
  ping -n 3 127.0.0.1 >nul
  exit /b 0
)

rem 2) 找 Node
set "NODE="
where node >nul 2>nul && set "NODE=node"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE goto trypython

echo   正在后台启动本地服务...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath '%NODE%' -ArgumentList 'tools\server.js' -WorkingDirectory '%CD%' -WindowStyle Hidden"
goto waitport

:trypython
where python >nul 2>nul
if errorlevel 1 goto filemode
echo   正在后台启动本地服务（Python）...
powershell -NoProfile -WindowStyle Hidden -Command "Start-Process -FilePath 'python' -ArgumentList 'tools\server.py' -WorkingDirectory '%CD%' -WindowStyle Hidden"
goto waitport

rem 3) 最多等 15 秒，端口起来再开浏览器
:waitport
set /a n=0
:wait
ping -n 2 127.0.0.1 >nul
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 goto open
set /a n+=1
if %n% lss 15 goto wait
echo.
echo   服务没能启动（可能是端口被占用，或 Node 版本太旧）。
echo   已改为直接打开文件，功能基本可用（仅"资料包 ZIP 带图片"需要本地服务）。
goto filemode

:open
echo   已启动，浏览器正在打开：%URL%
echo.
echo   服务在后台运行，没有黑窗口需要保持。
echo   要停止服务，双击"停止.bat"。
start "" "%URL%"
ping -n 4 127.0.0.1 >nul
exit /b 0

:filemode
start "" "index.html"
ping -n 4 127.0.0.1 >nul
exit /b 0
