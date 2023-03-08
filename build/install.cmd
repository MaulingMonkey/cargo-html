@pushd "%~dp0.." && setlocal
@call build\prebuild.cmd || goto :die

cargo install --locked --path .
@if ERRORLEVEL 1 goto :die

:die
@popd && endlocal && exit /b %ERRORLEVEL%
