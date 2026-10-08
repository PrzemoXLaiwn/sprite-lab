# Tells Bing (which powers ChatGPT search), Yandex, Seznam and Naver that the
# pages in the sitemap changed, so they re-crawl without waiting.
# https://www.indexnow.org — the key file lives at public/<key>.txt.
#   .\scripts\indexnow.ps1
# deploy.ps1 runs this automatically after a successful deploy.

$ErrorActionPreference = "Stop"
$site = "https://www.sprite-lab.com"
$key = "c6f81fb0bec5c30837cc8b5b3de2b36b"

$sitemap = (Invoke-WebRequest "$site/sitemap.xml" -UseBasicParsing -TimeoutSec 30).Content
$urls = [regex]::Matches($sitemap, "<loc>([^<]+)</loc>") | ForEach-Object { $_.Groups[1].Value }
$urls = @($urls) + "$site/llms.txt"

$body = @{
  host        = "www.sprite-lab.com"
  key         = $key
  keyLocation = "$site/$key.txt"
  urlList     = $urls
} | ConvertTo-Json -Depth 3

try {
  $r = Invoke-WebRequest "https://api.indexnow.org/indexnow" -Method Post -Body $body -ContentType "application/json; charset=utf-8" -UseBasicParsing -TimeoutSec 30
  Write-Host ("  IndexNow: {0} URLs submitted (HTTP {1})" -f $urls.Count, $r.StatusCode) -ForegroundColor Green
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  Write-Host ("  IndexNow: submission failed (HTTP {0}) - not critical" -f $code) -ForegroundColor Yellow
}
