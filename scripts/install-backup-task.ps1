$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskPolicy = Join-Path $taskRoot '.local-services/privacy/backup-policy.json'
if (-not (Test-Path -LiteralPath $taskPolicy)) { throw 'Choose the local retention period before installing automatic expiry.' }
$taskConfig = Get-Content -LiteralPath $taskPolicy -Raw | ConvertFrom-Json
if (-not $taskConfig.enabled -or $taskConfig.days -lt 1 -or $taskConfig.days -gt 365) { throw 'An enabled local retention policy is required.' }
$taskHasher = [System.Security.Cryptography.SHA256]::Create()
try { $taskHash = $taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskRoot)) } finally { $taskHasher.Dispose() }
$taskSuffix = ([BitConverter]::ToString($taskHash) -replace '-', '').Substring(0,8)
$taskName = 'TalkingStage-LocalBackupExpiry-' + $taskSuffix
$taskFile = Join-Path $PSScriptRoot 'backup-maintenance.ps1'
$taskArgs = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $taskFile + '"'
$taskExisting = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($taskExisting) {
  if ($taskExisting.Actions.Arguments -ne $taskArgs) { throw 'An unrelated task already uses this name.' }
  Write-Output 'The matching local backup expiry task already exists.'
  exit
}
$taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArgs -WorkingDirectory $taskRoot
$taskTrigger = New-ScheduledTaskTrigger -Daily -At '03:00'
$taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description 'Expires only verified TalkingStage managed local backups under the chosen retention policy.' | Out-Null
Write-Output 'Daily local managed-backup expiry task installed for the current Windows user.'
