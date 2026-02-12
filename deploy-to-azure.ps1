# Azure Deployment Script for M365 Portal
# This script will deploy your application to Azure App Service

Write-Host "🚀 M365 Portal - Azure Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
try {
    $azVersion = az --version 2>&1 | Select-Object -First 1
    Write-Host "✅ Azure CLI is installed: $azVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Please install it first: winget install -e --id Microsoft.AzureCLI" -ForegroundColor Yellow
    Write-Host "Then restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "⚙️  Configuration" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan

# Get user input for configuration
$RESOURCE_GROUP = Read-Host "Enter Resource Group name (default: m365portal-rg)"
if ([string]::IsNullOrWhiteSpace($RESOURCE_GROUP)) { $RESOURCE_GROUP = "m365portal-rg" }

$APP_NAME = Read-Host "Enter App Service name (must be globally unique, e.g., m365portal-yourname)"
if ([string]::IsNullOrWhiteSpace($APP_NAME)) {
    Write-Host "❌ App name is required and must be unique!" -ForegroundColor Red
    exit 1
}

$DB_ACCOUNT_NAME = Read-Host "Enter Cosmos DB account name (must be globally unique, e.g., m365db-yourname)"
if ([string]::IsNullOrWhiteSpace($DB_ACCOUNT_NAME)) {
    Write-Host "❌ Database name is required and must be unique!" -ForegroundColor Red
    exit 1
}

$LOCATION = Read-Host "Enter Azure region (default: centralindia)"
if ([string]::IsNullOrWhiteSpace($LOCATION)) { $LOCATION = "centralindia" }

$PLAN_NAME = "$APP_NAME-plan"

$SKU = Read-Host "Enter App Service tier (B1 for budget ~$13/mo, S1 for production ~$70/mo, default: B1)"
if ([string]::IsNullOrWhiteSpace($SKU)) { $SKU = "B1" }

Write-Host ""
Write-Host "📝 Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor White
Write-Host "  App Name: $APP_NAME" -ForegroundColor White
Write-Host "  Database: $DB_ACCOUNT_NAME" -ForegroundColor White
Write-Host "  Location: $LOCATION" -ForegroundColor White
Write-Host "  Tier: $SKU" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue with deployment? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "❌ Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔐 Logging into Azure..." -ForegroundColor Yellow
az login

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Azure login failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged in successfully!" -ForegroundColor Green
Write-Host ""

# Step 1: Create Resource Group
Write-Host "📦 Step 1/7: Creating Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Resource Group created!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create Resource Group!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Create App Service Plan
Write-Host "📦 Step 2/7: Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name $PLAN_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --is-linux `
    --sku $SKU

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App Service Plan created!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create App Service Plan!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Create Web App
Write-Host "📦 Step 3/7: Creating Web App..." -ForegroundColor Yellow
az webapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --plan $PLAN_NAME `
    --runtime "NODE:18-lts"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Web App created!" -ForegroundColor Green
    Write-Host "   URL: https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to create Web App!" -ForegroundColor Red
    Write-Host "   The app name might already be taken. Try a different name." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 4: Create Cosmos DB
Write-Host "📦 Step 4/7: Creating Cosmos DB (this may take 5-10 minutes)..." -ForegroundColor Yellow
az cosmosdb create `
    --name $DB_ACCOUNT_NAME `
    --resource-group $RESOURCE_GROUP `
    --kind MongoDB `
    --server-version 4.2 `
    --default-consistency-level Session `
    --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=False

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cosmos DB created!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to create Cosmos DB!" -ForegroundColor Red
    Write-Host "   The database name might already be taken. Try a different name." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 5: Get MongoDB Connection String
Write-Host "📦 Step 5/7: Getting MongoDB connection string..." -ForegroundColor Yellow
$MONGODB_URI = az cosmosdb keys list `
    --name $DB_ACCOUNT_NAME `
    --resource-group $RESOURCE_GROUP `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" `
    --output tsv

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Connection string retrieved!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to get connection string!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Configure Environment Variables
Write-Host "📦 Step 6/7: Configuring environment variables..." -ForegroundColor Yellow

# Read from .env file
$envFile = ".env"
$VITE_CLIENT_ID = ""
$VITE_TENANT_ID = ""
$GEMINI_API_KEY = ""

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^VITE_CLIENT_ID=(.+)$") { $VITE_CLIENT_ID = $matches[1] }
        if ($_ -match "^VITE_TENANT_ID=(.+)$") { $VITE_TENANT_ID = $matches[1] }
        if ($_ -match "^GEMINI_API_KEY=(.+)$") { $GEMINI_API_KEY = $matches[1] }
    }
}

if ([string]::IsNullOrWhiteSpace($VITE_CLIENT_ID)) {
    $VITE_CLIENT_ID = Read-Host "Enter VITE_CLIENT_ID (from your .env file)"
}

if ([string]::IsNullOrWhiteSpace($VITE_TENANT_ID)) {
    $VITE_TENANT_ID = Read-Host "Enter VITE_TENANT_ID (from your .env file)"
}

# Set all environment variables
az webapp config appsettings set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings `
        NODE_ENV=production `
        PORT=8080 `
        MONGODB_URI="$MONGODB_URI" `
        VITE_CLIENT_ID="$VITE_CLIENT_ID" `
        VITE_TENANT_ID="$VITE_TENANT_ID" `
        GEMINI_API_KEY="$GEMINI_API_KEY"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Environment variables configured!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to configure environment variables!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 7: Build and Deploy
Write-Host "📦 Step 7/7: Building and deploying application..." -ForegroundColor Yellow

Write-Host "   Building frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "   Creating deployment package..." -ForegroundColor Cyan
if (Test-Path "deploy.zip") {
    Remove-Item "deploy.zip" -Force
}

# Create zip excluding unnecessary files
$excludeItems = @("node_modules", ".git", ".vite", "*.log", "deploy.zip")
$itemsToZip = Get-ChildItem -Path . -Exclude $excludeItems

Compress-Archive -Path $itemsToZip -DestinationPath "deploy.zip" -Force

Write-Host "   Deploying to Azure..." -ForegroundColor Cyan
az webapp deployment source config-zip `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --src "deploy.zip"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is now live at:" -ForegroundColor Cyan
Write-Host "  https://$APP_NAME.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Update Azure AD App Registration:" -ForegroundColor White
Write-Host "     - Go to: https://portal.azure.com" -ForegroundColor White
Write-Host "     - Navigate to: Azure Active Directory > App registrations" -ForegroundColor White
Write-Host "     - Select your app" -ForegroundColor White
Write-Host "     - Add redirect URI: https://$APP_NAME.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "  2. View logs:" -ForegroundColor White
Write-Host "     az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Restart app if needed:" -ForegroundColor White
Write-Host "     az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Estimated Monthly Cost:" -ForegroundColor Cyan
if ($SKU -eq "B1") {
    Write-Host "  ~₹1,630/month (~`$20/month)" -ForegroundColor White
} else {
    Write-Host "  ~₹7,950/month (~`$96/month)" -ForegroundColor White
}
Write-Host ""
Write-Host "🛠️  Useful Commands:" -ForegroundColor Cyan
Write-Host "  View app in browser: start https://$APP_NAME.azurewebsites.net" -ForegroundColor Gray
Write-Host "  View in Azure Portal: start https://portal.azure.com" -ForegroundColor Gray
Write-Host ""
Write-Host "Happy deploying! 🚀" -ForegroundColor Green
