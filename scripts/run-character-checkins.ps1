$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskLogFolder = Join-Path $taskRoot '.local-services\character-checkins'
New-Item -ItemType Directory -Path $taskLogFolder -Force | Out-Null
Set-Location -LiteralPath $taskRoot
& (Get-Command node.exe).Source (Join-Path $PSScriptRoot 'run-character-checkins.mjs') --run *> (Join-Path $taskLogFolder 'latest-run.log')
exit $LASTEXITCODE
