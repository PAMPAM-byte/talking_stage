$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskLogFolder = Join-Path $taskRoot '.local-services\character-checkins'
New-Item -ItemType Directory -Path $taskLogFolder -Force | Out-Null
Set-Location -LiteralPath $taskRoot
$taskNode = (Get-Command node.exe).Source
$taskNodeArgs = '"' + (Join-Path $PSScriptRoot 'run-character-checkins.mjs') + '" --run'
$taskProcess = Start-Process -FilePath $taskNode -ArgumentList $taskNodeArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -Wait -PassThru -RedirectStandardOutput (Join-Path $taskLogFolder 'latest-run.log') -RedirectStandardError (Join-Path $taskLogFolder 'latest-runtime.log')
exit $taskProcess.ExitCode
