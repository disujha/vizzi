# Sync Fix Guide - Dashboard Clinic Name Issue

## Problem Summary

Dashboard shows clinic name from localStorage instead of the backend (AppSync). This happens because:
1. Clinic lookup is failing to find the record in AppSync
2. Dashboard falls back to localStorage data
3. No visual indication that sync failed

## What I've Fixed

### 1. Added Sync Status Indicator
**File**: `src/app/dashboard/page.tsx`

The dashboard now shows real-time sync status in the top-right corner:
- 🔵 **Syncing...** - Fetching data from backend
- 🟢 **Synced** - Successfully loaded from AppSync
- 🟠 **Local Only** - Using localStorage fallback (sync failed)
- 🔴 **Sync Error** - Error occurred during sync

### 2. Improved Clinic Lookup Logic
**File**: `src/app/dashboard/page.tsx`

Enhanced the clinic resolution to try multiple methods:
1. Direct ID lookup: `clinic-8585810708`
2. Phone filter: `+918585810708`
3. Email filter: `8585810708@mobile.vizzi.local`

Added detailed console logging to debug which method works.

### 3. Created Debug API Endpoint
**File**: `src/app/api/debug-clinic/route.ts`

New endpoint to check what's actually stored in AppSync:
```
GET /api/debug-clinic?mobile=8585810708
```

## Testing Steps

### Step 1: Check Current Sync Status

1. Open dashboard: http://localhost:3000/dashboard
2. Look at top-right corner for sync status indicator
3. Open browser console (F12)
4. Look for logs starting with `[Dashboard]`

**Expected logs if synced**:
```
[Dashboard] Resolving clinic for: { userId: "clinic-8585810708", ... }
[Dashboard] Trying userId: clinic-8585810708
[Dashboard] ✓ Found by userId: { id: "clinic-8585810708", clinicName: "test clinic", ... }
[Dashboard] Updating session with real clinic name: test clinic
```

**Expected logs if using localStorage**:
```
[Dashboard] Resolving clinic for: { userId: "clinic-8585810708", ... }
[Dashboard] Trying userId: clinic-8585810708
[Dashboard] ✗ userId failed: ...
[Dashboard] ✗ No clinic found in backend
[Dashboard] Using localStorage fallback
```

### Step 2: Use Debug API to Check Backend

Open this URL in your browser:
```
http://localhost:3000/api/debug-clinic?mobile=8585810708
```

**Expected response if clinic exists**:
```json
{
  "searchedFor": {
    "mobile": "8585810708",
    "clinicId": "clinic-8585810708",
    "phoneE164": "+918585810708"
  },
  "attempts": [
    {
      "method": "Direct ID lookup",
      "id": "clinic-8585810708",
      "success": true,
      "data": {
        "id": "clinic-8585810708",
        "clinicName": "test clinic",
        "phone": "+918585810708",
        "smsClinicName": "TESTCLINIC1"
      }
    }
  ]
}
```

**If clinic doesn't exist**:
```json
{
  "searchedFor": { ... },
  "attempts": [
    {
      "method": "Direct ID lookup",
      "success": false,
      "error": "..."
    },
    {
      "method": "List by phone filter",
      "success": false,
      "count": 0
    }
  ]
}
```

### Step 3: Check localStorage

Open browser console and run:
```javascript
// Check current session
JSON.parse(localStorage.getItem('vizzi_auth_session'))

// Check all vizzi keys
Object.keys(localStorage).filter(k => k.startsWith('vizzi_'))
```

## Common Issues & Solutions

### Issue 1: Clinic Not Found in AppSync

**Symptom**: Debug API shows `success: false` for all attempts

**Cause**: Clinic record was never created during signup

**Solution**: Re-signup or manually create clinic record

**Manual Fix via AWS CLI**:
```bash
# Check if clinic exists
aws appsync list-graphql-apis --region ap-south-1

# Use AppSync console to run mutation
mutation CreateClinic {
  createClinic(input: {
    id: "clinic-8585810708"
    clinicName: "test clinic"
    name: "test clinic"
    phone: "+918585810708"
    email: "8585810708@mobile.vizzi.local"
    smsClinicName: "TESTCLINIC1"
    currentPlan: "FREE"
    status: OPEN
  }) {
    id
    clinicName
  }
}
```

### Issue 2: Permission Denied / Unauthorized

**Symptom**: Debug API shows error like "Not Authorized to access getClinic"

**Cause**: AppSync authorization rules blocking public access

**Solution**: Check `amplify/data/resource.ts` authorization rules

**Current rules**:
```typescript
.authorization((allow) => [
  allow.publicApiKey().to(['create', 'read', 'update']),
  allow.authenticated().to(['create', 'read', 'update']),
])
```

**Verify API Key**:
```bash
# Check if API key is valid
cat amplify_outputs.json | grep aws_appsync_apiKey
```

### Issue 3: Wrong Clinic ID Format

**Symptom**: Clinic exists but lookup fails

**Cause**: ID format mismatch between signup and dashboard

**Check signup creates**:
```javascript
// In src/app/login/page.tsx
const clinicId = generateClinicIdFromMobile(normalized);
// Returns: "clinic-8585810708"
```

**Check dashboard looks for**:
```javascript
// In src/app/dashboard/page.tsx
user.userId // Should be: "clinic-8585810708"
```

**Solution**: Ensure localStorage session has correct userId format

**Fix localStorage**:
```javascript
// In browser console
const session = JSON.parse(localStorage.getItem('vizzi_auth_session'));
session.userId = 'clinic-8585810708'; // Ensure correct format
localStorage.setItem('vizzi_auth_session', JSON.stringify(session));
// Reload page
location.reload();
```

## UX Improvements Made

### 1. Visual Sync Status
Users can now see if their data is synced or using local cache.

### 2. Better Error Logging
Console logs show exactly which lookup method succeeded/failed.

### 3. Automatic Session Update
When clinic is found in backend, localStorage session is updated with the real clinic name.

### 4. Graceful Fallback
If backend fails, app still works using localStorage (offline-first approach).

## Recommended Next Steps

### Short-term (Quick Fixes)
1. ✅ Test with debug API to verify clinic exists
2. ✅ Check browser console for sync status
3. ✅ Fix localStorage if userId format is wrong
4. ✅ Re-signup if clinic doesn't exist in backend

### Medium-term (Better UX)
1. Add "Refresh" button to manually retry sync
2. Show toast notification when sync fails
3. Add settings page to view/edit clinic details
4. Implement retry logic with exponential backoff

### Long-term (Architecture)
1. Implement proper cache invalidation strategy
2. Add offline queue for status changes
3. Sync status changes to backend (not just localStorage)
4. Add conflict resolution for multi-device scenarios

## Testing Checklist

- [ ] Dashboard shows sync status indicator
- [ ] Console logs show clinic resolution attempts
- [ ] Debug API returns clinic data
- [ ] Clinic name matches what was entered during signup
- [ ] Status changes (OPEN/CLOSED) persist across page reloads
- [ ] Multiple devices show same clinic name (if synced)

## Files Modified

1. `src/app/dashboard/page.tsx` - Added sync status, improved lookup
2. `src/app/api/debug-clinic/route.ts` - New debug endpoint
3. `SYNC_FIX_GUIDE.md` - This guide
4. `DASHBOARD_DATA_SYNC_ANALYSIS.md` - Technical analysis

## Support

If sync still fails after following this guide:
1. Share debug API response
2. Share browser console logs
3. Share localStorage session data
4. Check AWS AppSync console for errors
