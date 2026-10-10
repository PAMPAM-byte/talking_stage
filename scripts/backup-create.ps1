$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
Set-Location -LiteralPath $taskRoot
& node (Join-Path $PSScriptRoot 'run-scheduled-backup.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Daily managed backup creation failed; inspect local task status.' }
