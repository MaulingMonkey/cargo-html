@pushd "%~dp0.." && setlocal

cargo clean
cargo clean --manifest-path examples/Cargo.toml

@popd && endlocal && exit /b %ERRORLEVEL%
