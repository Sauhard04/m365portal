# Diagnostic: Why Get-Label Not Found

## Possible Causes

### 1. Token Not Being Passed (Most Likely)
**Symptom**: GitHub Actions log shows:
```
INPUT_TOKEN: 
INPUT_ORG: 
INPUT_UPN: 
No token provided - running command without SCC authentication
```

**Cause**: Browser cache - old code is still running

**Fix**: 
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache completely
3. Sign out and sign back in
4. Check browser console for `[Purview Sync]` logs

### 2. Connection Fails Silently
**Symptom**: GitHub Actions log shows:
```
Using Organization: intunetraininglabs.onmicrosoft.com
Failed to connect to SCC: <error message>
```

**Cause**: Token permissions or authentication issue

**Fix**: Check Azure AD app permissions for Exchange Online

### 3. Cmdlets Not Imported After Connection
**Symptom**: GitHub Actions log shows:
```
Connected to Security & Compliance Center.
WARNING: Get-Label cmdlet not found after connection
```

**Cause**: Module loaded but cmdlets not available in session

**Fix**: Need to explicitly import the compliance cmdlets

## Quick Debug Steps

### Step 1: Check Browser Console
Open DevTools (F12) and run:
```javascript
// Check if new code is loaded
const testScope = 'outlook.office365.com';
console.log('Looking for scope:', testScope);

// Try the sync and watch console
// Should see: [Purview Sync] Requesting Exchange Online token...
```

### Step 2: Check Network Tab
1. Open Network tab in DevTools
2. Click "Sync via Terminal"
3. Look for the POST request to `/api/script/run`
4. Check the request payload - should include:
   ```json
   {
     "command": "...",
     "token": "<long string>",
     "tokenType": "exo",
     "organization": "intunetraininglabs.onmicrosoft.com",
     "userUpn": "demouser@..."
   }
   ```

### Step 3: Check Backend Logs
In your terminal running `npm run dev:all`, look for:
```
Executing script (Remote): ... with token: true, org: <domain>, upn: <email>
```

If it says `token: false` or `org: N/A`, the problem is in the frontend.

## Most Common Issue: Browser Cache

**90% of the time, this is because:**
- Browser cached the old ServicePage.jsx
- Old code requests SCC token (`ps.compliance.protection.outlook.com`)
- New code requests EXO token (`outlook.office365.com`)
- Browser is using old cached version

**Solution:**
1. Close ALL browser tabs for your app
2. Clear browser cache (Settings → Privacy → Clear browsing data)
3. Restart browser
4. Navigate to app fresh
5. Sign in again
6. Try sync

## If Still Failing After Cache Clear

Share these logs:
1. Browser console output (all `[Purview Sync]` messages)
2. Backend terminal output (the `Executing script` line)
3. Full GitHub Actions workflow log
4. Network tab request payload for `/api/script/run`

This will help identify exactly where the token/org/upn are being lost.
