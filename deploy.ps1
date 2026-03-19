# deploy.ps1
# Build script for Cloudflare Pages with OpenNext

$publishableKey = "pk_test_bG92aW5nLXNsdWctOTguY2xlcmsuYWNjb3VudHMuZGV2JA"
$env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = $publishableKey

# Build everything using the automated npm script
npm run build:cloudflare

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nDeployment package ready in .open-next/" -ForegroundColor Yellow
Write-Host "You can now run: npx wrangler pages deploy .open-next" -ForegroundColor Cyan
