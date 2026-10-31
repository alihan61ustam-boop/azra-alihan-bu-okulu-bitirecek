param(
  [string]$RepoName = "azra-alihan-bu-okulu-bitirecek",
  [string]$GitHubUser = "alihan61ustam-boop"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "=== Azra&Alihan Bu Okulu Bitirecek | GitHub Yayinlama Araci ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
  git init
}

git branch -M main
git add .

$status = git status --porcelain
if ($status) {
  git commit -m "feat: Azra&Alihan Bu Okulu Bitirecek multimodal AI study platform"
}

$remoteUrl = "https://github.com/$GitHubUser/$RepoName.git"
$existingRemote = git remote
if ($existingRemote -contains "origin") {
  git remote set-url origin $remoteUrl
} else {
  git remote add origin $remoteUrl
}

Write-Host "GitHub uzerine gonderiliyor: $remoteUrl" -ForegroundColor Yellow
git push -u origin main

Write-Host ""
Write-Host "Tamamlandi! GitHub Actions otomatik olarak GitHub Pages dagitimini baslatir." -ForegroundColor Green
Write-Host "Canli Site Adresi: https://$GitHubUser.github.io/$RepoName/" -ForegroundColor Cyan
