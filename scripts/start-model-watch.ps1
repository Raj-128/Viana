$ErrorActionPreference = 'Stop'
$workspace = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node.exe).Source
$pidFile = Join-Path $workspace '.private/model-watcher.pid'
if (Test-Path -LiteralPath $pidFile) {
  $watcherId = Get-Content -LiteralPath $pidFile
  if (Get-Process -Id $watcherId -ErrorAction SilentlyContinue | Where-Object ProcessName -eq 'node') { exit 0 }
}
$watcher = Start-Process -FilePath $nodePath -ArgumentList 'scripts/watch-model-library.js' -WorkingDirectory $workspace -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $workspace '.private/model-watch.log') -RedirectStandardError (Join-Path $workspace '.private/model-watch-error.log')
Set-Content -LiteralPath $pidFile -Value $watcher.Id
Write-Output "Model watcher started (PID $($watcher.Id))."
