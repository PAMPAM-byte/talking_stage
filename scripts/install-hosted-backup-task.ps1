$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskPolicy = Join-Path $taskRoot '.local-services/hosted-privacy/backup-policy.json'
if (-not (Test-Path -LiteralPath $taskPolicy)) { throw 'A verified hosted backup with approved retention is required.' }
$taskConfig = Get-Content -LiteralPath $taskPolicy -Raw | ConvertFrom-Json
if (-not $taskConfig.enabled -or $taskConfig.days -ne 7) { throw 'The approved seven-day hosted policy is required.' }
foreach ($taskDependency in @('.env.hosted.local', '.local-services/hosted-backup-stage/supabase-ca.crt', '.local-services/hosted-privacy/encryption.key', '.local-services/hosted-privacy/ledger.key')) {
  if (-not (Test-Path -LiteralPath (Join-Path $taskRoot $taskDependency))) { throw 'A hosted backup dependency is missing.' }
}
$taskHasher = [System.Security.Cryptography.SHA256]::Create()
try { $taskHash = $taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskRoot)) } finally { $taskHasher.Dispose() }
$taskSuffix = ([BitConverter]::ToString($taskHash) -replace '-', '').Substring(0,8)
$taskName = 'TalkingStage-HostedBackupCreate-' + $taskSuffix
$taskFile = Join-Path $PSScriptRoot 'run-scheduled-hosted-backup.mjs'
$taskNode = (Get-Command node.exe -ErrorAction Stop).Source
$taskArgs = '"' + $taskFile + '"'
$taskExisting = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($taskExisting) {
  if ($taskExisting.Actions.Execute -ne $taskNode -or $taskExisting.Actions.Arguments -ne $taskArgs -or $taskExisting.Actions.WorkingDirectory -ne $taskRoot) { throw 'An unrelated task already uses this name.' }
  Write-Output 'The matching daily hosted backup task already exists.'
  exit
}
$taskAction = New-ScheduledTaskAction -Execute $taskNode -Argument $taskArgs -WorkingDirectory $taskRoot
$taskTrigger = New-ScheduledTaskTrigger -Daily -At '03:15'
$taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description 'Creates an encrypted hosted TalkingStage database and cast-photo backup once per Windows-local day; seven-day retention applies after successful verification.' | Out-Null
Write-Output 'Daily hosted backup installed for 03:15 Windows local time, with three 15-minute retries on failure.'
