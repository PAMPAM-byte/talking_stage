$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskScript = Join-Path $taskRoot 'scripts\run-character-checkins.ps1'
$taskHasher = [System.Security.Cryptography.SHA256]::Create()
try { $taskHash = $taskHasher.ComputeHash([Text.Encoding]::UTF8.GetBytes($taskRoot)) } finally { $taskHasher.Dispose() }
$taskName = 'TalkingStage-CharacterCheckins-' + (([BitConverter]::ToString($taskHash) -replace '-', '').Substring(0,8))
$taskArgs = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $taskScript + '"'
$taskExisting = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($taskExisting) {
 if ($taskExisting.Actions.Arguments -ne $taskArgs -or $taskExisting.Actions.WorkingDirectory -ne $taskRoot) { throw 'An unrelated task already uses this name.' }
 Write-Output 'The matching character check-in task already exists.'
 exit
}
$taskAction = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArgs -WorkingDirectory $taskRoot
$taskTrigger = New-ScheduledTaskTrigger -Once -At ((Get-Date).AddMinutes(15)) -RepetitionInterval (New-TimeSpan -Minutes 15)
$taskUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$taskPrincipal = New-ScheduledTaskPrincipal -UserId $taskUser -LogonType Interactive -RunLevel Limited
$taskSettings = New-ScheduledTaskSettingsSet -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Principal $taskPrincipal -Settings $taskSettings -Description 'Checks opted-in TalkingStage accounts every 15 minutes while Windows is running. Existing AI budgets, daytime delivery, cooldowns and unanswered-message limits apply.' | Out-Null
Write-Output 'Character check-ins scheduled every 15 minutes while this Windows account is running. Off preferences never generate messages.'
