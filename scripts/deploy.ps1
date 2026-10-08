# =============================================================================
# SpriteLab — production deploy (run from the project root in a terminal)
#
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
#
# Order matters: the new code reads new DB columns, so the schema goes first.
# =============================================================================
# Not "Stop": in Windows PowerShell 5.1 any stderr line from a native tool
# (e.g. the Vercel CLI banner) would abort the script. Exit codes are checked
# explicitly instead.
$ErrorActionPreference = "Continue"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path .env.local)) {
  Write-Host "Missing .env.local - run: npx vercel env pull .env.local --environment=production" -ForegroundColor Red
  exit 1
}

Write-Host "`n[1/4] Applying database schema (additive: new columns, indexes, 1 table)..." -ForegroundColor Cyan
npx dotenv -e .env.local -- npx prisma db push --skip-generate
if ($LASTEXITCODE -ne 0) { Write-Host "Schema push failed - nothing deployed." -ForegroundColor Red; exit 1 }

Write-Host "`n[2/4] Ensuring QUEUE_SECRET exists on Vercel..." -ForegroundColor Cyan
$envList = (cmd /c "npx vercel env ls production 2>nul") | Out-String
if ($envList -notmatch "QUEUE_SECRET") {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  $secret | npx vercel env add QUEUE_SECRET production
  if ($LASTEXITCODE -ne 0) { Write-Host "Could not add QUEUE_SECRET - continuing (queue stays disabled)." -ForegroundColor Yellow }
} else {
  Write-Host "QUEUE_SECRET already set."
}

Write-Host "`n[3/4] Deploying to production..." -ForegroundColor Cyan
npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) { Write-Host "Deploy failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[4/4] Smoke test..." -ForegroundColor Cyan
foreach ($path in "/", "/api/stats", "/api/lifetime-slots", "/pixel-art-generator") {
  try {
    $r = Invoke-WebRequest "https://www.sprite-lab.com$path" -UseBasicParsing -TimeoutSec 30 -Headers @{ "User-Agent" = "Mozilla/5.0" }
    Write-Host ("  OK   {0}  {1}" -f $r.StatusCode, $path) -ForegroundColor Green
  } catch {
    Write-Host ("  FAIL {0}" -f $path) -ForegroundColor Red
  }
}
Write-Host "`n[+] Notifying search engines (IndexNow)..." -ForegroundColor Cyan
try { & "$PSScriptRoot\indexnow.ps1" } catch { Write-Host "  IndexNow skipped: $_" -ForegroundColor Yellow }
Write-Host "`nDone." -ForegroundColor Green
