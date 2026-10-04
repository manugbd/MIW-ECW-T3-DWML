param([string]$Zig = "zig")

$ErrorActionPreference = "Stop"
$destination = Join-Path $PSScriptRoot "../wasm"
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$wasm = Join-Path $destination "weather.wasm"

# Usa un compilador disponible; no descarga ni instala herramientas.
& $Zig c++ -target wasm32-freestanding -O2 -nostdlib -ffreestanding -fno-builtin `
    -fno-exceptions -fno-rtti '-Wl,--no-entry' '-Wl,--export-memory' `
    '-Wl,--export=capacity' '-Wl,--export=input_ptr' '-Wl,--export=output_ptr' `
    '-Wl,--export=summary_ptr' '-Wl,--export=compare_days' `
    "$PSScriptRoot/weather.cpp" -o $wasm

if ($LASTEXITCODE -ne 0) {
    throw "No se pudo compilar weather.cpp a weather.wasm."
}

# La copia de los bytes permite usar WebAssembly sin fetch de archivos locales.
$binary = [Convert]::ToBase64String([IO.File]::ReadAllBytes($wasm))
$javascript = "// Generado desde weather.wasm por cpp/compile.ps1.`nconst WeatherBinary = `"$binary`";`n"
[IO.File]::WriteAllText((Join-Path $destination "weather.js"), $javascript)
Write-Host "Generados weather.wasm y weather.js."
