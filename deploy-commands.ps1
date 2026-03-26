# Quick Deploy Script - Copy and paste these commands one by one

# STEP 1: Login to Azure (this will open a browser)
az login

# STEP 2: Set your configuration (CHANGE THESE VALUES!)
$RESOURCE_GROUP = "m365portal-rg"
$APP_NAME = "m365portal-sauhard"  # ⚠️ CHANGE THIS - must be globally unique!
$DB_ACCOUNT_NAME = "m365db-sauhard"  # ⚠️ CHANGE THIS - must be globally unique!
$LOCATION = "centralindia"
$PLAN_NAME = "$APP_NAME-plan"
$SKU = "B1"  # B1 = ~$13/month, S1 = ~$70/month

# STEP 3: Create Resource Group
Write-Host "Creating Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION

# STEP 4: Create App Service Plan
Write-Host "Creating App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name $PLAN_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --is-linux `
    --sku $SKU

# STEP 5: Create Web App
Write-Host "Creating Web App..." -ForegroundColor Yellow
az webapp create `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --plan $PLAN_NAME `
    --runtime "NODE:18-lts"

# STEP 6: Create Cosmos DB (this takes 5-10 minutes!)
Write-Host "Creating Cosmos DB (this will take 5-10 minutes)..." -ForegroundColor Yellow
az cosmosdb create `
    --name $DB_ACCOUNT_NAME `
    --resource-group $RESOURCE_GROUP `
    --kind MongoDB `
    --server-version 4.2 `
    --default-consistency-level Session `
    --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=False

# STEP 7: Get MongoDB Connection String
Write-Host "Getting MongoDB connection string..." -ForegroundColor Yellow
$MONGODB_URI = az cosmosdb keys list `
    --name $DB_ACCOUNT_NAME `
    --resource-group $RESOURCE_GROUP `
    --type connection-strings `
    --query "connectionStrings[0].connectionString" `
    --output tsv

Write-Host "MongoDB URI: $MONGODB_URI" -ForegroundColor Green

# STEP 8: Get your credentials from .env file
# ⚠️ REPLACE THESE WITH YOUR ACTUAL VALUES FROM .env FILE
$VITE_CLIENT_ID = "your_client_id_here"
$VITE_TENANT_ID = "your_tenant_id_here"
$GEMINI_API_KEY = "your_gemini_key_here"  # Optional

# STEP 9: Configure Environment Variables
Write-Host "Configuring environment variables..." -ForegroundColor Yellow
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

# STEP 10: Build the application
Write-Host "Building application..." -ForegroundColor Yellow
npm run build

# STEP 11: Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" -Force }
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# STEP 12: Deploy to Azure
Write-Host "Deploying to Azure..." -ForegroundColor Yellow
az webapp deployment source config-zip `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --src deploy.zip

# STEP 13: Show results
Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "Your app is live at: https://$APP_NAME.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ IMPORTANT: Update Azure AD redirect URI!" -ForegroundColor Yellow
Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
Write-Host "2. Azure Active Directory > App registrations > Your App" -ForegroundColor White
Write-Host "3. Add redirect URI: https://$APP_NAME.azurewebsites.net" -ForegroundColor White
