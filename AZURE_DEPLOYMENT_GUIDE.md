# 🚀 Azure Deployment Guide - M365 Portal 


Complete step-by-step guide to deploy your M365 Portal to Azure App Service.

---

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ **Azure Account** - [Sign up for free](https://azure.microsoft.com/free/)
- ✅ **Azure CLI** - [Download here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- ✅ **Git** - For version control and deployment
- ✅ **Node.js 18+** - Already installed
- ✅ **Domain name** (optional) - For custom domain

---

## 🎯 Deployment Overview

We'll deploy your app as a **monolithic application** (frontend + backend together) on Azure App Service (Linux).

**Architecture:**
```
Azure App Service (Linux, Node.js 18+)
├── Frontend (Vite build - served as static files)
├── Backend (Express server on port 8080)
├── MongoDB (Azure Cosmos DB)
└── File Storage (App Service file system or Azure Storage)
```

---

## 📦 Part 1: Prepare Your Application

### Step 1.1: Install Azure CLI

**Windows (PowerShell):**
```powershell
# Download and install Azure CLI
winget install -e --id Microsoft.AzureCLI
```

**Verify installation:**
```bash
az --version
```

---

### Step 1.2: Login to Azure

```bash
az login
```

This will open a browser window for authentication. Sign in with your Azure account.

**Verify login:**
```bash
az account show
```

---

### Step 1.3: Create Production Build Configuration

Create a new file for production environment variables:

**File: `.env.production`**
```env
# Azure Production Environment Variables
NODE_ENV=production
PORT=8080

# MongoDB Connection (will be updated after creating Cosmos DB)
MONGODB_URI=your_cosmos_db_connection_string

# Microsoft Graph API (same as your .env)
VITE_CLIENT_ID=your_client_id
VITE_TENANT_ID=your_tenant_id

# Optional: AI Services
GEMINI_API_KEY=your_gemini_key
```

---

### Step 1.4: Update Package.json Scripts

Add production build and start scripts:

**File: `package.json`**
```json
{
  "scripts": {
    "dev": "vite",
    "server": "tsx server/index.ts",
    "dev:all": "concurrently \"npm run dev\" \"npm run server\"",
    "build": "vite build",
    "build:server": "tsc server/index.ts --outDir dist-server --module commonjs",
    "start": "node dist-server/index.js",
    "preview": "vite preview"
  }
}
```

---

### Step 1.5: Create Server Configuration for Production

Create a new file to serve both frontend and backend:

**File: `server/production.js`**
```javascript
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Import your existing server routes
import('./index.js').then(serverModule => {
    // Your API routes are already configured in index.js
    console.log('API routes loaded');
});

// Serve static files from Vite build
app.use(express.static(path.join(__dirname, '../dist')));

// Catch-all route - serve index.html for client-side routing
app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Production server running on port ${PORT}`);
    console.log(`📊 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
});
```

---

### Step 1.6: Update Server Index to Support Production

**File: `server/index.ts`** (add at the end, before `app.listen`):

```typescript
// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    app.use(express.static(path.join(__dirname, '../dist')));
    
    // Catch-all route for client-side routing
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        }
    });
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
```

---

### Step 1.7: Create Azure Deployment Configuration

**File: `.deployment`**
```ini
[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

**File: `web.config`** (for Windows App Service - optional):
```xml
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server/index.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server/index.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server/index.js"/>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 🏗️ Part 2: Create Azure Resources

### Step 2.1: Set Variables

```bash
# Set your variables
$RESOURCE_GROUP="m365portal-rg"
$LOCATION="centralindia"  # or your preferred region
$APP_NAME="m365portal-app"  # Must be globally unique
$PLAN_NAME="m365portal-plan"
$DB_ACCOUNT_NAME="m365portal-db"  # Must be globally unique
```

---

### Step 2.2: Create Resource Group

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
```

**Expected output:**
```json
{
  "id": "/subscriptions/.../resourceGroups/m365portal-rg",
  "location": "centralindia",
  "name": "m365portal-rg",
  "properties": {
    "provisioningState": "Succeeded"
  }
}
```

---

### Step 2.3: Create App Service Plan (Linux)

**For Budget (B1 Basic - ~$13/month):**
```bash
az appservice plan create `
  --name $PLAN_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku B1
```

**For Production (S1 Standard - ~$70/month):**
```bash
az appservice plan create `
  --name $PLAN_NAME `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --is-linux `
  --sku S1
```

---

### Step 2.4: Create Web App

```bash
az webapp create `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --plan $PLAN_NAME `
  --runtime "NODE:18-lts"
```

**Expected output:**
```json
{
  "defaultHostName": "m365portal-app.azurewebsites.net",
  "enabled": true,
  "name": "m365portal-app",
  "state": "Running"
}
```

---

### Step 2.5: Create Cosmos DB for MongoDB

```bash
# Create Cosmos DB account
az cosmosdb create `
  --name $DB_ACCOUNT_NAME `
  --resource-group $RESOURCE_GROUP `
  --kind MongoDB `
  --server-version 4.2 `
  --default-consistency-level Session `
  --locations regionName=$LOCATION failoverPriority=0 isZoneRedundant=False

# Create database
az cosmosdb mongodb database create `
  --account-name $DB_ACCOUNT_NAME `
  --resource-group $RESOURCE_GROUP `
  --name m365portal
```

**Get connection string:**
```powershell
# Get connection string
$MONGODB_URI = az cosmosdb keys list `
  --name $DB_ACCOUNT_NAME `
  --resource-group $RESOURCE_GROUP `
  --type connection-strings `
  --query "connectionStrings[0].connectionString" `
  --output tsv
```

> [!IMPORTANT]
> **Manual Way**: If the command above fails, go to the **Azure Portal** > **Cosmos DB** > **Connection Strings** and copy the **Primary MongoDB Connection String**.

**Copy this connection string - you'll need it!**

---

### Step 2.6: Configure Environment Variables

```bash
# Set Node environment
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings NODE_ENV=production

# Set MongoDB connection
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings MONGODB_URI="your_cosmos_db_connection_string_here"

# Set Microsoft Graph credentials
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings VITE_CLIENT_ID="your_client_id" VITE_TENANT_ID="your_tenant_id"

# Set Support API Key (Web3Forms)
# Get a free key at: https://web3forms.com
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings VITE_WEB3FORMS_ACCESS_KEY="your_web3forms_key"

# Set port
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings PORT=8080

# Optional: Set AI API keys
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings GEMINI_API_KEY="your_gemini_key"
```

---

### Step 2.7: Configure Startup Command

```bash
az webapp config set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --startup-file "npm run build && node server/index.js"
```

---

## 📤 Part 3: Deploy Your Application

### Step 3.1: Initialize Git Repository (if not already done)

```bash
cd c:\Users\SauhardKaushik\Downloads\m365portal

# Initialize git
git init

# Add .gitignore
echo "node_modules/
.env
.env.local
dist/
.vite/
*.log" > .gitignore

# Add all files
git add .

# Commit
git commit -m "Initial commit for Azure deployment"
```

---

### Step 3.2: Deploy Using Azure CLI

**Option A: Deploy from Local Git**

```bash
# Configure deployment user (one-time setup)
az webapp deployment user set `
  --user-name your-deployment-username `
  --password your-secure-password

# Get Git URL
$GIT_URL = az webapp deployment source config-local-git `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query url `
  --output tsv

# Add Azure remote
git remote add azure $GIT_URL

# Deploy
git push azure main
```

---

**Option B: Deploy Using ZIP Deploy (Faster)**

```bash
# Build the application
npm run build

# Create deployment package
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# Deploy
az webapp deployment source config-zip `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --src deploy.zip
```

---

**Option C: Deploy from GitHub (Recommended for CI/CD)**

```bash
# First, push your code to GitHub
# Then configure GitHub deployment

az webapp deployment source config `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --repo-url https://github.com/yourusername/m365portal `
  --branch main `
  --manual-integration
```

---

### Step 3.3: Monitor Deployment

```bash
# View deployment logs
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP

# Check app status
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query state
```

---

## 🌐 Part 4: Configure Custom Domain (Optional)

### Step 4.1: Add Custom Domain

```bash
# Add domain
az webapp config hostname add `
  --webapp-name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --hostname yourdomain.com
```

---

### Step 4.2: Configure DNS

Add these DNS records at your domain registrar:

**For root domain (yourdomain.com):**
```
Type: A
Name: @
Value: [Your App IP - get from Azure Portal]
TTL: 3600
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: m365portal-app.azurewebsites.net
TTL: 3600
```

---

### Step 4.3: Enable Free SSL

```bash
az webapp config ssl bind `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --certificate-thumbprint auto `
  --ssl-type SNI
```

---

## 🔧 Part 5: Post-Deployment Configuration

### Step 5.1: Update Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Select your app
4. Go to **Authentication**
5. Add redirect URIs:
   - `https://m365portal-app.azurewebsites.net`
   - `https://yourdomain.com` (if using custom domain)

---

### Step 5.2: Enable Application Insights (Monitoring)

```bash
# Create Application Insights
az monitor app-insights component create `
  --app m365portal-insights `
  --location $LOCATION `
  --resource-group $RESOURCE_GROUP `
  --application-type web

# Link to Web App
$INSTRUMENTATION_KEY = az monitor app-insights component show `
  --app m365portal-insights `
  --resource-group $RESOURCE_GROUP `
  --query instrumentationKey `
  --output tsv

az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

---

### Step 5.3: Configure CORS (if needed)

```bash
az webapp cors add `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --allowed-origins https://yourdomain.com
```

---

## ✅ Part 6: Verify Deployment

### Step 6.1: Test Your Application

1. **Open your app:**
   ```
   https://m365portal-app.azurewebsites.net
   ```

2. **Test authentication:**
   - Sign in with Microsoft account
   - Verify permissions are requested correctly

3. **Test API endpoints:**
   ```
   https://m365portal-app.azurewebsites.net/api/health
   ```

4. **Check logs:**
   ```bash
   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
   ```

---

## 🔄 Part 7: Continuous Deployment with GitHub Actions

Create `.github/workflows/azure-deploy.yml`:

```yaml
name: Deploy to Azure App Service

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build application
      run: npm run build
      
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'm365portal-app'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

**Get publish profile:**
```bash
az webapp deployment list-publishing-profiles `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --xml
```

Add this as a secret named `AZURE_WEBAPP_PUBLISH_PROFILE` in your GitHub repository.

---

## 📊 Cost Estimate

### Monthly Costs (Central India region):

**Budget Configuration:**
- App Service (B1 Linux): ₹1,080/month (~$13)
- Cosmos DB (Serverless): ₹400/month (~$5)
- Bandwidth: ₹150/month (~$2)
- **Total: ~₹1,630/month (~$20)**

**Production Configuration:**
- App Service (S1 Linux): ₹5,800/month (~$70)
- Cosmos DB (400 RU/s): ₹2,000/month (~$24)
- Storage Account: ₹150/month (~$2)
- Application Insights: FREE (first 5GB)
- **Total: ~₹7,950/month (~$96)**

---

## 🛠️ Troubleshooting

### Issue: App won't start

**Check logs:**
```bash
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP
```

**Common fixes:**
- Verify `PORT=8080` in app settings
- Check startup command
- Ensure all dependencies are in `package.json`

---

### Issue: Database connection fails

**Verify connection string:**
```bash
az webapp config appsettings list `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --query "[?name=='MONGODB_URI']"
```

**Check Cosmos DB firewall:**
- Go to Azure Portal > Cosmos DB > Firewall
- Add App Service outbound IPs or enable "Allow access from Azure services"

---

### Issue: Build fails

**Enable build logs:**
```bash
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

---

## 📚 Useful Commands

```bash
# Restart app
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP

# View app settings
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP

# Scale up/down
az appservice plan update --name $PLAN_NAME --resource-group $RESOURCE_GROUP --sku S1

# Delete everything (cleanup)
az group delete --name $RESOURCE_GROUP --yes
```

---

## 🎉 Next Steps

1. ✅ Set up custom domain
2. ✅ Configure SSL certificate
3. ✅ Enable Application Insights monitoring
4. ✅ Set up GitHub Actions for CI/CD
5. ✅ Configure backup and disaster recovery
6. ✅ Set up staging slots (S1+ tier)

---

## 📞 Support

- **Azure Documentation**: https://docs.microsoft.com/azure
- **Azure Support**: https://azure.microsoft.com/support
- **Pricing Calculator**: https://azure.microsoft.com/pricing/calculator

---

**Good luck with your deployment! 🚀**
