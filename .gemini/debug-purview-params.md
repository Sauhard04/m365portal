# Quick Test Script for Purview Sync

Open your browser console and run this to test the parameter extraction:

```javascript
// Get MSAL instance and accounts
const accounts = window.msalInstance?.getAllAccounts();
if (accounts && accounts[0]) {
    const userUpn = accounts[0].username;
    const tenantId = accounts[0].tenantId;
    const organization = userUpn ? userUpn.split('@')[1] : `${tenantId}.onmicrosoft.com`;
    
    console.log('Account Info:');
    console.log('- UPN:', userUpn);
    console.log('- Tenant ID:', tenantId);
    console.log('- Organization:', organization);
    console.log('- Full Account:', accounts[0]);
} else {
    console.error('No accounts found. Please sign in first.');
}
```

## Expected Output:
- UPN: your.email@domain.com
- Tenant ID: 3163c13f-b80f-426c-94b0-fa4c0bf66ad7
- Organization: domain.com (or tenantid.onmicrosoft.com)

## If Organization is Empty:
The issue is that the account object doesn't have a username. Check:
1. Are you signed in?
2. Does `accounts[0]` exist?
3. What properties does the account have?

## Next Steps After Verification:
1. Click "Sync via Terminal" in Purview portal
2. Check browser console for `[Purview Sync]` logs
3. Verify organization and UPN are shown
4. Check GitHub Actions logs for the values
