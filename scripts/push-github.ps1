# Publishes this folder to GitHub (PrzemoXLaiwn/sprite-lab, branch main).
#   .\scripts\push-github.ps1 "what changed"
# This folder isn't a git checkout, so the script keeps a clone in
# %LOCALAPPDATA%\sprite-lab-repo, mirrors the project into it (without
# node_modules, build output, .env files or local Claude settings), commits
# and pushes. The first push opens a GitHub sign-in window in the browser.

param([string]$Message = "Update from local workspace")

$ErrorActionPreference = "Stop"
$git = "C:\Program Files\Git\cmd\git.exe"
if (-not (Test-Path $git)) { $git = "git" }
$repoUrl = "https://github.com/PrzemoXLaiwn/sprite-lab.git"
$src = Split-Path -Parent $PSScriptRoot
$clone = Join-Path $env:LOCALAPPDATA "sprite-lab-repo"

if (-not (Test-Path (Join-Path $clone ".git"))) {
  Write-Host "Cloning $repoUrl ..."
  & $git clone --quiet $repoUrl $clone
} else {
  Write-Host "Updating local clone ..."
  & $git -C $clone fetch --quiet origin
  # Keep commits that were prepared but not pushed yet; otherwise start from GitHub's main
  $ahead = [int](& $git -C $clone rev-list --count origin/main..HEAD)
  if ($ahead -eq 0) { & $git -C $clone reset --quiet --hard origin/main }
  else { Write-Host "$ahead unpushed commit(s) found - they will be pushed too." }
}

Write-Host "Copying project files ..."
robocopy $src $clone /MIR /XD node_modules .next .vercel .git .claude /XF .env .env.local .env*.local *.tsbuildinfo next-env.d.ts /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

& $git -C $clone add -A
$changes = & $git -C $clone status --porcelain
if (-not $changes) { Write-Host "Nothing to publish - GitHub is up to date."; exit 0 }

& $git -C $clone -c user.name="PrzemoXLaiwn" -c user.email="itslocotv@gmail.com" commit --quiet -m $Message
Write-Host "Pushing to GitHub (a browser sign-in may open the first time) ..."
& $git -C $clone push origin main
if ($LASTEXITCODE -ne 0) { throw "git push failed" }
Write-Host "Done: https://github.com/PrzemoXLaiwn/sprite-lab"
