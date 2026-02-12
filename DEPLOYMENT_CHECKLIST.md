# ✅ Azure Deployment Checklist

Use this checklist to ensure you complete all steps for a successful deployment.

## 📋 Pre-Deployment Checklist

### Local Setup
- [ ] Azure CLI installed (`az --version`)
- [ ] Logged into Azure (`az login`)
- [ ] Git initialized in project (`git init`)
- [ ] All dependencies installed (`npm install`)
- [ ] Local build works (`npm run build`)
- [ ] Server runs in production mode (`npm start`)

### Environment Variables
- [ ] Copy `.env` to `.env.production.template`
- [ ] Fill in all required values in `.env.production.template`
- [ ] Have Microsoft Graph API credentials ready
  - [ ] VITE_CLIENT_ID
  - [ ] VITE_TENANT_ID
- [ ] Have optional API keys ready (Gemini, Web3Forms, etc.)

### Code Preparation
- [ ] Server updated with production static file serving (✅ Done)
- [ ] Package.json has `start` script (✅ Done)
- [ ] `.deployment` file created (✅ Done)
- [ ] `startup.sh` created (✅ Done)
- [ ] `.gitignore` excludes sensitive files

---

## 🏗️ Azure Resources Checklist

### Resource Group
- [ ] Resource group created
- [ ] Name: `m365portal-rg` (or your choice)
- [ ] Location: `centralindia` (or your choice)

### App Service Plan
- [ ] App Service Plan created
- [ ] Name: `m365portal-plan`
- [ ] OS: Linux ✅
- [ ] Tier: B1 (budget) or S1 (production)

### Web App
- [ ] Web App created
- [ ] Name: `m365portal-app` (must be globally unique)
- [ ] Runtime: Node.js 18 LTS
- [ ] URL: `https://m365portal-app.azurewebsites.net`

### Cosmos DB
- [ ] Cosmos DB account created
- [ ] Name: `m365portal-db` (must be globally unique)
- [ ] API: MongoDB
- [ ] Server version: 4.2
- [ ] Database created: `m365portal`
- [ ] Connection string saved

---

## ⚙️ Configuration Checklist

### App Settings (Environment Variables)
- [ ] NODE_ENV=production
- [ ] PORT=8080
- [ ] MONGODB_URI=(from Cosmos DB)
- [ ] VITE_CLIENT_ID=(your client ID)
- [ ] VITE_TENANT_ID=(your tenant ID)
- [ ] GEMINI_API_KEY=(optional)
- [ ] VITE_WEB3FORMS_KEY=(optional)

### Startup Configuration
- [ ] Startup command set (or using default)
- [ ] Build during deployment enabled

---

## 📤 Deployment Checklist

### Code Deployment
- [ ] Code committed to Git
- [ ] Choose deployment method:
  - [ ] Option A: ZIP Deploy (fastest)
  - [ ] Option B: Local Git
  - [ ] Option C: GitHub Actions (CI/CD)
- [ ] Deployment successful
- [ ] No errors in deployment logs

### Post-Deployment
- [ ] App is running (`az webapp show`)
- [ ] Can access app URL
- [ ] Health check endpoint works (`/api/health`)
- [ ] Frontend loads correctly
- [ ] No console errors

---

## 🔐 Azure AD Configuration Checklist

### App Registration Updates
- [ ] Navigate to Azure Portal > Azure AD > App registrations
- [ ] Select your app
- [ ] Add redirect URI: `https://m365portal-app.azurewebsites.net`
- [ ] Add redirect URI: `https://yourdomain.com` (if using custom domain)
- [ ] Save changes

### Test Authentication
- [ ] Can sign in with Microsoft account
- [ ] Permissions are requested correctly
- [ ] Token is received
- [ ] API calls work

---

## 🌐 Custom Domain Checklist (Optional)

### Domain Purchase
- [ ] Domain purchased (Namecheap, Cloudflare, Azure, etc.)
- [ ] Domain name: `_______________`

### DNS Configuration
- [ ] A record added pointing to App Service IP
- [ ] CNAME record added for www subdomain
- [ ] DNS propagation complete (check with `nslookup`)

### Azure Configuration
- [ ] Custom domain added to App Service
- [ ] Domain ownership verified
- [ ] SSL certificate created (free managed certificate)
- [ ] HTTPS redirect enabled
- [ ] Can access app via custom domain

---

## 📊 Monitoring Checklist

### Application Insights
- [ ] Application Insights created
- [ ] Linked to Web App
- [ ] Instrumentation key configured
- [ ] Logs are being collected
- [ ] Can view metrics in Azure Portal

### Logging
- [ ] Application logging enabled
- [ ] Can view live logs (`az webapp log tail`)
- [ ] Error tracking works

---

## 🧪 Testing Checklist

### Functionality Tests
- [ ] Homepage loads
- [ ] Authentication works
- [ ] Dashboard displays data
- [ ] API endpoints respond correctly
- [ ] Search functionality works
- [ ] Charts render properly
- [ ] Theme switching works (light/dark)
- [ ] Mobile responsive design works

### Performance Tests
- [ ] Page load time acceptable (< 3 seconds)
- [ ] API response times good (< 1 second)
- [ ] No memory leaks
- [ ] Database queries optimized

---

## 🔄 CI/CD Checklist (Optional)

### GitHub Actions Setup
- [ ] Code pushed to GitHub
- [ ] `.github/workflows/azure-deploy.yml` created
- [ ] Azure publish profile downloaded
- [ ] Publish profile added to GitHub secrets
- [ ] Workflow runs successfully
- [ ] Auto-deployment works on push to main

---

## 💰 Cost Management Checklist

### Budget Setup
- [ ] Azure budget created
- [ ] Alert threshold set (e.g., $50/month)
- [ ] Email notifications configured

### Cost Optimization
- [ ] Using appropriate tier (B1 for dev, S1 for prod)
- [ ] Auto-scaling configured (S1+ only)
- [ ] Unused resources deleted
- [ ] Cosmos DB using serverless or appropriate RU/s

---

## 🛡️ Security Checklist

### App Service Security
- [ ] HTTPS only enabled
- [ ] Minimum TLS version: 1.2
- [ ] CORS configured correctly
- [ ] Environment variables not exposed in logs

### Database Security
- [ ] Cosmos DB firewall configured
- [ ] Only Azure services can access (or specific IPs)
- [ ] Connection string stored securely (App Settings)

### Secrets Management
- [ ] No secrets in source code
- [ ] All secrets in Azure App Settings or Key Vault
- [ ] `.env` files in `.gitignore`

---

## 📚 Documentation Checklist

### Internal Documentation
- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Architecture diagram created (optional)
- [ ] Runbook for common issues

### External Documentation
- [ ] README.md updated with deployment info
- [ ] User guide created (if needed)
- [ ] API documentation (if public API)

---

## 🎉 Launch Checklist

### Final Checks
- [ ] All features tested in production
- [ ] Performance acceptable
- [ ] No critical bugs
- [ ] Monitoring in place
- [ ] Backup strategy defined
- [ ] Rollback plan ready

### Go Live
- [ ] DNS updated to production domain
- [ ] Users notified (if applicable)
- [ ] Support channels ready
- [ ] Monitoring dashboard open

---

## 📞 Support Resources

- **Azure Documentation**: https://docs.microsoft.com/azure
- **Azure Support**: https://azure.microsoft.com/support
- **Pricing Calculator**: https://azure.microsoft.com/pricing/calculator
- **Status Page**: https://status.azure.com

---

## 🔧 Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| App won't start | Check logs: `az webapp log tail` |
| 500 errors | Check environment variables |
| Database connection fails | Verify MONGODB_URI and firewall |
| Build fails | Check Node.js version (18+) |
| Authentication fails | Update redirect URIs in Azure AD |

---

**Last Updated**: 2026-02-10

**Status**: Ready for deployment ✅
