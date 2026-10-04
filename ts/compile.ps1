param([string]$Tsc = "tsc")

$ErrorActionPreference = "Stop"

# Solo recompila con un TypeScript disponible; no instala dependencias.
& $Tsc --target ES2020 --module none --strict --noEmitOnError `
    --outFile "$PSScriptRoot/../js/analysis.js" "$PSScriptRoot/analysis.ts"

if ($LASTEXITCODE -ne 0) {
    throw "No se pudo compilar analysis.ts a analysis.js."
}

Write-Host "Generado js/analysis.js."
