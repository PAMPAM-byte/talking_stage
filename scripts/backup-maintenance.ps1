$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
& node (Join-Path $PSScriptRoot 'local-backups.mjs') expire
if ($LASTEXITCODE -ne 0) { throw 'Managed backup expiry failed; inspect the local maintenance run.' }
