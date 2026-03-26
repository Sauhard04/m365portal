# 🚀 Ready to Deploy - Follow These Steps

Azure CLI is now installed! Follow these steps to deploy your M365 Portal:

## Step 1: Open a NEW PowerShell Window

**IMPORTANT**: You must open a NEW PowerShell window for Azure CLI to work.

1. Close this terminal/PowerShell window
2. Open a NEW PowerShell window
3. Navigate back to your project:
   ```powershell
   cd c:\Users\SauhardKaushik\Downloads\m365portal
   ```

## Step 2: Verify Azure CLI

```powershell
az --version
```

You should see the Azure CLI version information.

## Step 3: Run the Deployment Script

I've created an automated deployment script that will:
- ✅ Log you into Azure
- ✅ Create all necessary resources
- ✅ Configure environment variables
- ✅ Build and deploy your app

**Run this command:**

```powershell
.\deploy-to-azure.ps1
```

## Step 4: Answer the Prompts

The script will ask you for:

1. **Resource Group name** (default: m365portal-rg)
   - Press Enter to use default

2. **App Service name** (MUST be globally unique!)
   - Example: `m365portal-sauhard` or `m365portal-yourname`
   - This will be your URL: `https://your-app-name.azurewebsites.net`

3. **Cosmos DB name** (MUST be globally unique!)
   - Example: `m365db-sauhard` or `m365db-yourname`

4. **Azure region** (default: centralindia)
   - Press Enter to use default

5. **App Service tier** (default: B1)
   - B1 = Budget (~$13/month)
   - S1 = Production (~$70/month)
   - Press Enter for B1

6. **Confirm deployment** (yes/no)
   - Type `yes` and press Enter

## Step 5: Azure Login

- A browser window will open
- Sign in with your Azure account
- Close the browser and return to PowerShell

## Step 6: Wait for Deployment

The script will:
- ✅ Create Resource Group (30 seconds)
- ✅ Create App Service Plan (1 minute)
- ✅ Create Web App (1 minute)
- ✅ Create Cosmos DB (5-10 minutes) ⏰
- ✅ Configure environment variables (30 seconds)
- ✅ Build and deploy app (2-3 minutes)

**Total time: ~15-20 minutes**

## Step 7: Update Azure AD

After deployment completes, you MUST update your Azure AD app registration:

1. Go to: https://portal.azure.com
2. Navigate to: **Azure Active Directory** > **App registrations**
3. Select your app
4. Go to **Authentication**
5. Click **Add a platform** > **Web**
6. Add redirect URI: `https://your-app-name.azurewebsites.net`
7. Click **Save**

## Step 8: Test Your App

Open your app in a browser:
```
https://your-app-name.azurewebsites.net
```

---

## 🛠️ If the Script Doesn't Work

Run the commands manually:

### Login to Azure
```powershell
az login
```

### Set Variables (CHANGE THESE!)
```powershell
$RESOURCE_GROUP="m365portal-rg"
$APP_NAME="m365portal-yourname"  # MUST BE UNIQUE!
$DB_ACCOUNT_NAME="m365db-yourname"  # MUST BE UNIQUE!
$LOCATION="centralindia"
$PLAN_NAME="$APP_NAME-plan"
```

### Create Resources
```powershell
# Create Resource Group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan
az appservice plan create --name $PLAN_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --is-linux --sku B1

# Create Web App
az webapp create --name $APP_NAME --resource-group $RESOURCE_GROUP --plan $PLAN_NAME --runtime "NODE:18-lts"

# Create Cosmos DB (takes 5-10 minutes)
az cosmosdb create --name $DB_ACCOUNT_NAME --resource-group $RESOURCE_GROUP --kind MongoDB --server-version 4.2 --locations regionName=$LOCATION

# Get MongoDB connection string
$MONGODB_URI = az cosmosdb keys list --name $DB_ACCOUNT_NAME --resource-group $RESOURCE_GROUP --type connection-strings --query "connectionStrings[0].connectionString" --output tsv
```

### Configure Environment Variables
```powershell
# Get your values from .env file
$VITE_CLIENT_ID = "your_client_id_here"
$VITE_TENANT_ID = "your_tenant_id_here"

# Set environment variables
az webapp config appsettings set --name $APP_NAME --resource-group $RESOURCE_GROUP --settings NODE_ENV=production PORT=8080 MONGODB_URI="$MONGODB_URI" VITE_CLIENT_ID="$VITE_CLIENT_ID" VITE_TENANT_ID="$VITE_TENANT_ID"
```

### Build and Deploy
```powershell
# Build
npm run build

# Create deployment package
Compress-Archive -Path * -DestinationPath deploy.zip -Force

# Deploy
az webapp deployment source config-zip --name $APP_NAME --resource-group $RESOURCE_GROUP --src deploy.zip
```

---

## 📊 Cost Estimate

**B1 Tier (Budget):**
- App Service: ₹1,080/month (~$13)
- Cosmos DB: ₹400/month (~$5)
- Total: ~₹1,630/month (~$20)

**S1 Tier (Production):**
- App Service: ₹5,800/month (~$70)
- Cosmos DB: ₹2,000/month (~$24)
- Total: ~₹7,950/month (~$96)

---

## 🆘 Troubleshooting

### "App name already taken"
- Choose a different, more unique name
- Try: `m365portal-sauhard-2024` or similar

### "Database name already taken"
- Choose a different, more unique name
- Try: `m365db-sauhard-2024` or similar

### "Build failed"
- Make sure you're in the project directory
- Run `npm install` first

### "Deployment failed"
- Check logs: `az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP`
- Restart app: `az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP`

---

## ✅ Success Checklist

After deployment:
- [ ] App URL opens in browser
- [ ] Can sign in with Microsoft account
- [ ] Dashboard loads correctly
- [ ] No console errors
- [ ] Azure AD redirect URI updated

---

**Ready? Open a NEW PowerShell window and run: `.\deploy-to-azure.ps1`**

Good luck! 🚀
