# 🚀 Quick Start - Azure Deployment

This is a condensed version of the full deployment guide. For detailed instructions, see `AZURE_DEPLOYMENT_GUIDE.md`.

## ⚡ Fast Track Deployment (15 minutes)

### 1️⃣ Prerequisites
- Install Azure CLI: `winget install -e --id Microsoft.AzureCLI`
- Login: `az login`

### 2️⃣ Set Variables
```powershell
$RESOURCE_GROUP="m365portal-rg"
$LOCATION="centralindia"
$APP_NAME="m365portal-app"  # Change to something unique
$PLAN_NAME="m365portal-plan"
$DB_ACCOUNT_NAME="m365portal-db"  # Change to something unique
```

### 3️⃣ Create Resources
```powershell
# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (Linux, B1)
az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --is-linux --sku B1

# Create Web App
az webapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --plan $PLAN_NAME --runtime "NODE:18-lts"

# Create Cosmos DB
az cosmosdb create --name $DB_ACCOUNT_NAME --resource-group $RESOURCE_GROUP --kind MongoDB --server-version 4.2 --locations regionName=$LOCATION

# Get MongoDB connection string
$MONGODB_URI = az cosmosdb keys list --name $DB_ACCOUNT_NAME --resource-group $RESOURCE_GROUP --type connection-strings --query "connectionStrings[0].connectionString" --output tsv
```

### 4️⃣ Configure Environment
```powershell
# Set environment variables
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings `
  NODE_ENV=production `
  PORT=8080 `
  MONGODB_URI="$MONGODB_URI" `
  VITE_CLIENT_ID="your_client_id" `
  VITE_TENANT_ID="your_tenant_id"
```

### 5️⃣ Deploy
```powershell
# Build locally
npm run build

# Deploy using ZIP
Compress-Archive -Path * -DestinationPath deploy.zip -Force
az webapp deployment source config-zip --name $APP_NAME --resource-group $RESOURCE_GROUP --src deploy.zip
```

### 6️⃣ Access Your App
```
https://$APP_NAME.azurewebsites.net
```

## 📊 Cost Estimate
- **Budget (B1)**: ~₹1,630/month (~$20/month)
- **Production (S1)**: ~₹7,950/month (~$96/month)

## 🔧 Useful Commands
```powershell
# View logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Restart app
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

# Delete everything
az group delete --name $RESOURCE_GROUP --yes
```

## 📚 Full Documentation
See `AZURE_DEPLOYMENT_GUIDE.md` for:
- Custom domain setup
- SSL configuration
- GitHub Actions CI/CD
- Troubleshooting
- Monitoring setup

---

**Need help?** Check the full guide or Azure documentation.
