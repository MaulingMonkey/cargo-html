@pushd "%~dp0.." && setlocal

@call build\prebuild.cmd                                                        || goto :die
@call :ee cargo fetch                                                           || goto :die
@call :ee cargo fetch --manifest-path examples/Cargo.toml                       || goto :die

:: debug
@call :ee cargo build --frozen --workspace --all-targets                        || goto :die
@call :ee cargo test  --frozen --workspace --all-targets                        || goto :die
@call :ee target\debug\cargo-html html --manifest-path examples/Cargo.toml      || goto :die

:: release
@call :ee cargo build --frozen --workspace --all-targets --release              || goto :die
@call :ee cargo test  --frozen --workspace --all-targets --release              || goto :die
@call :ee target\release\cargo-html html --manifest-path examples/Cargo.toml    || goto :die

:die
@popd && endlocal && exit /b %ERRORLEVEL%



:: "Echo + Execute"
:ee
@echo %*
@call %*
@exit /b %ERRORLEVEL%

