$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskPolicy = Join-Path $taskRoot '.local-services/privacy/backup-policy.json'
if (-not (Test-Path -LiteralPath $taskPolicy)) { throw 'An approved local backup retention policy is required.' }
$taskConfig = Get-Content -LiteralPath $taskPolicy -Raw | ConvertFrom-Json
if (-not $taskConfig.enabled -or $taskConfig.days -lt 1 -or $taskConfig.days -gt 365) { throw 'An enabled local backup retention policy is required.' }
$taskHasher = [System.Security.Cryptography.SHA256]::Create()
try { $taskHash = $taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskRoot)) } finally { $taskHasher.Dispose() }
$taskSuffix = ([BitConverter]::ToString($taskHash) -replace '-', '').Substring(0,8)
$taskName = 'TalkingStage-LocalBackupCreate-' + $taskSuffix
$taskFile = Join-Path $PSScriptRoot 'backup-create.ps1'
$taskArgs = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $taskFile + '"'
$taskExisting = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($taskExisting) {
  if ($taskExisting.Actions.Arguments -ne $taskArgs -or $taskExisting.Actions.WorkingDirectory -ne $taskRoot) { throw 'An unrelated task already uses this name.' }
  Write-Output 'The matching daily local backup task already exists.'
  exit
}
$taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArgs -WorkingDirectory $taskRoot
$taskTrigger = New-ScheduledTaskTrigger -Daily -At '02:45'
$taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description 'Creates a verified local TalkingStage database snapshot once per Windows-local calendar day; existing approved retention applies.' | Out-Null
Write-Output 'Daily local backup creation installed for 02:45, with three 15-minute retries on failure.'
