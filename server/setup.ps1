# Downloads the pinned PocketBase build for this machine. The version lives in
# .pb-version and nowhere else, so an upgrade is one line and the Dockerfile follows.
$ErrorActionPreference = 'Stop'

Set-Location $PSScriptRoot
$version = (Get-Content .pb-version -Raw).Trim()

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
$asset = "pocketbase_${version}_windows_${arch}.zip"
$url = "https://github.com/pocketbase/pocketbase/releases/download/v${version}/${asset}"

Write-Output "Fetching $asset"
Invoke-WebRequest -Uri $url -OutFile $asset

# -Force overwrites: re-running this is how you upgrade.
Expand-Archive -Path $asset -DestinationPath . -Force
Remove-Item $asset, CHANGELOG.md, LICENSE.md -ErrorAction SilentlyContinue

Write-Output "PocketBase $version is ready. Next:"
Write-Output "  .\pocketbase.exe serve --publicDir=.."
Write-Output "  .\pocketbase.exe superuser create you@example.com yourpassword"
