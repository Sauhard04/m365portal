# 🚀 DEPLOYMENT READY - READ THIS FIRST

## ✅ Everything is Prepared!

I've set up everything you need to deploy to Azure. Here's what's ready:

### 📁 Files Created:
1. ✅ **START_HERE.md** - Step-by-step instructions
2. ✅ **deploy-to-azure.ps1** - Automated deployment script (interactive)
3. ✅ **deploy-commands.ps1** - Manual commands (copy & paste)
4. ✅ **AZURE_DEPLOYMENT_GUIDE.md** - Full detailed guide
5. ✅ **DEPLOYMENT_CHECKLIST.md** - Checklist to track progress

### 🔧 Code Updates:
1. ✅ **server/index.ts** - Updated for production deployment
2. ✅ **package.json** - Added production start script
3. ✅ **.deployment** - Azure build configuration
4. ✅ **cross-env** - Installed for environment variables

---

## 🎯 CHOOSE YOUR METHOD

### Method 1: Automated Script (Recommended)

**Open a NEW PowerShell window** and run:

```powershell
cd c:\Users\SauhardKaushik\Downloads\m365portal
.\deploy-to-azure.ps1
```

This will guide you through the entire process with prompts.

---

### Method 2: Manual Commands

1. Open **deploy-commands.ps1**
2. **Edit lines 5-7** with unique names:
   ```powershell
   $APP_NAME = "m365portal-sauhard"  # Change this!
   $DB_ACCOUNT_NAME = "m365db-sauhard"  # Change this!
   ```
3. **Edit lines 42-44** with your .env values
4. Copy and paste commands one by one into PowerShell

---

## ⚠️ BEFORE YOU START

### 1. Choose Unique Names

Your app and database names must be **globally unique** across all of Azure:

- ❌ Bad: `m365portal-app` (too common)
- ✅ Good: `m365portal-sauhard-2024`
- ✅ Good: `m365portal-yourname`

### 2. Get Your Environment Variables

Open your `.env` file and copy these values:
- `VITE_CLIENT_ID`
- `VITE_TENANT_ID`
- `GEMINI_API_KEY` (optional)

### 3. Choose Your Tier

- **B1** = Budget (~₹1,630/month or ~$20/month)
- **S1** = Production (~₹7,950/month or ~$96/month)

Start with B1, you can upgrade later!

---

## 📋 DEPLOYMENT STEPS OVERVIEW

1. **Login to Azure** (browser will open)
2. **Create resources** (~2 minutes)
3. **Create database** (~10 minutes) ⏰
4. **Configure settings** (~1 minute)
5. **Build & deploy** (~3 minutes)

**Total time: ~15-20 minutes**

---

## 🎉 AFTER DEPLOYMENT

### 1. Update Azure AD

**CRITICAL**: You must update your Azure AD app registration:

1. Go to: https://portal.azure.com
2. Navigate to: **Azure Active Directory** > **App registrations**
3. Select your app
4. Go to **Authentication**
5. Add redirect URI: `https://your-app-name.azurewebsites.net`
6. Click **Save**

### 2. Test Your App

Open: `https://your-app-name.azurewebsites.net`

### 3. View Logs (if needed)

```powershell
az webapp log tail --name your-app-name --resource-group m365portal-rg
```

---

## 🆘 TROUBLESHOOTING

### "az command not found"
- **Solution**: Open a NEW PowerShell window (Azure CLI needs fresh session)

### "App name already taken"
- **Solution**: Choose a more unique name (add your name, year, etc.)

### "Build failed"
- **Solution**: Run `npm install` first

### "Authentication failed"
- **Solution**: Make sure you updated Azure AD redirect URI

---

## 💰 COST BREAKDOWN

### B1 Tier (Budget):
- App Service (Linux, B1): ₹1,080/month
- Cosmos DB (Serverless): ₹400/month
- Bandwidth: ₹150/month
- **Total: ~₹1,630/month (~$20/month)**

### S1 Tier (Production):
- App Service (Linux, S1): ₹5,800/month
- Cosmos DB (400 RU/s): ₹2,000/month
- Storage: ₹150/month
- **Total: ~₹7,950/month (~$96/month)**

---

## 🚀 READY TO DEPLOY?

### Quick Start:

1. **Open a NEW PowerShell window**
2. Run:
   ```powershell
   cd c:\Users\SauhardKaushik\Downloads\m365portal
   .\deploy-to-azure.ps1
   ```
3. Follow the prompts
4. Wait for completion
5. Update Azure AD redirect URI
6. Test your app!

---

## 📚 NEED MORE HELP?

- **Detailed Guide**: See `AZURE_DEPLOYMENT_GUIDE.md`
- **Step-by-Step**: See `START_HERE.md`
- **Manual Commands**: See `deploy-commands.ps1`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`

---

**Everything is ready! Open a NEW PowerShell window and start deploying! 🎉**
