@cmake --version >NUL 2>NUL && goto :skip-add-cmake-path
@if defined ProgramW6432      if exist "%ProgramW6432%\CMake\bin\cmake.exe" set "PATH=%PATH%;%ProgramW6432%\CMake\bin"
@if defined ProgramFiles      if exist "%ProgramFiles%\CMake\bin\cmake.exe" set "PATH=%PATH%;%ProgramFiles%\CMake\bin"
@if defined ProgramFiles(x86) if exist "%ProgramFiles(x86)%\CMake\bin\cmake.exe" set "PATH=%PATH%;%ProgramFiles(x86)%\CMake\bin"
:skip-add-cmake-path

:: required to build binaryen-sys
@call cmake --version >NUL 2>NUL || echo error: cmake not installed - download and install from https://cmake.org/ && exit /b 1

:: required to build script dir
@call npm --version >NUL 2>NUL || echo error: npm not installed - download and install as part of node.js from https://nodejs.org/ && exit /b 1

call npm install --prefer-offline --audit=false --silent
@if ERRORLEVEL 1 exit /b %ERRORLEVEL%

call node_modules/.bin/tsc --build script/tsconfig.json
@if ERRORLEVEL 1 exit /b %ERRORLEVEL%
