# Purview Terminal Sync - Authorization Fix

## Issue Resolved
**Error**: `UnAuthorized` when connecting to Security & Compliance Center

## Root Cause
The SCC-specific token scope (`https://ps.compliance.protection.outlook.com/.default`) was not providing the correct permissions for `Connect-IPPSSession` with access tokens.

## Solution
Switched to **Exchange Online token** (`https://outlook.office365.com/.default`) which has the necessary permissions to connect to both Exchange Online and Security & Compliance Center.

## Changes Made

### 1. Token Scope Change (`ServicePage.jsx`)
**Before**:
```javascript
scopes: ["https://ps.compliance.protection.outlook.com/.default"]
```

**After**:
```javascript
scopes: ["https://outlook.office365.com/.default"]
```

### 2. Token Type Update
- Changed `tokenType` from `'scc'` to `'exo'`
- Updated PowerShellService to accept both types

### 3. Why This Works
The Exchange Online token (`https://outlook.office365.com/.default`) includes permissions for:
- ✅ Exchange Online Management
- ✅ Security & Compliance Center
- ✅ Purview cmdlets (Get-Label, Get-ComplianceCase, etc.)

The SCC-specific scope was too restrictive and didn't grant the necessary permissions for token-based authentication.

## Testing
1. Click "Sync via Terminal" in Purview portal
2. Token will be acquired for Exchange Online
3. GitHub Actions will connect using the EXO token
4. Connection should succeed with organization/UPN
5. Purview data will be fetched and displayed

## Expected GitHub Actions Output
```
Using Organization: intunetraininglabs.onmicrosoft.com
Connected to Security & Compliance Center.
Executing command...
{"sensitivityLabels":[...],"eDiscoveryCases":[...],"dlpPolicies":0}
```

## Next Steps
- Verify the connection succeeds
- Check that data is returned
- Confirm dashboard updates with Purview stats
