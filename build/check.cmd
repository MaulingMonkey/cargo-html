@pushd "%~dp0.." && setlocal
@call build\prebuild.cmd || goto :die

cargo check --workspace --all-targets
@if ERRORLEVEL 1 goto :die

:die
@popd && endlocal && exit /b %ERRORLEVEL%
