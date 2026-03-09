# Clinic Lookup Error - Quick Fix Guide

## Error Message
```
[Dashboard] ✗ userId failed: {}
```

This means the dashboard tried to fetch the clinic from AppSync but got an empty response.

---

## Step 1: Check Your Session Data

### Open Debug Page
Go to: http://localhost:3000/dashboard/debug

This page shows:
1. Your user object from AuthContext
2. Your localStorage session
3. All vizzi localStorage keys
4. Debug API test button

### What to Look For

**Good userId format**:
```json
{
  "userId": "clinic-8585810708",
  "username": "test clinic",
  "mobile": "+918585810708"
}
```

**Bad userId format**:
```json
{
  "userId": "8585810708",  // Missing "clinic-" prefix
  "username": "Clinic 0708",
  "mobile": "+918585810708"
}
```

---

## Step 2: Test Debug API

1. On the debug page, click **"Test Debug API"**
2. Check the response

### Good Response (Clinic Exists)
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
        "phone": "+918585810708"
      }
    }
  ]
}
```

### Bad Response (Clinic Missing)
```json
{
  "searchedFor": { ... },
  "attempts": [
    {
      "method": "Direct ID lookup",
      "success": false,
      "error": "No data returned"
    },
    {
      "method": "List by phone filter",
      "success": false,
      "count": 0
    }
  ]
}
```

---

## Common Issues & Fixes

### Issue 1: userId Missing "clinic-" Prefix

**Symptom**: userId is just the mobile number (e.g., "8585810708")

**Cause**: localStorage session was created incorrectly

**Fix**: Update localStorage
```javascript
// Open browser console (F12)
const session = JSON.parse(localStorage.getItem('vizzi_auth_session'));
session.userId = 'clinic-' + session.userId; // Add prefix
localStorage.setItem('vizzi_auth_session', JSON.stringify(session));
location.reload();
```

---

### Issue 2: Clinic Doesn't Exist in Backend

**Symptom**: Debug API shows all attempts failed

**Cause**: Clinic record was never created during signup

**Fix Option A - Re-signup**:
1. Logout from dashboard
2. Go to login page
3. Click "Create clinic account"
4. Enter same mobile number + clinic name
5. Complete OTP verification

**Fix Option B - Manual Creation via AWS CLI**:
```bash
# First, get your AppSync API details
cat amplify_outputs.json | grep aws_appsync

# Then use AWS AppSync console to run this mutation:
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

---

### Issue 3: AppSync Authorization Error

**Symptom**: Debug API shows "Not Authorized" error

**Cause**: AppSync API key expired or missing

**Fix**: Check amplify_outputs.json
```bash
# Check if API key exists and is valid
cat amplify_outputs.json | grep aws_appsync_apiKey

# If missing or expired, regenerate:
npx ampx sandbox
```

---

### Issue 4: Wrong Phone Number Format

**Symptom**: Clinic exists but lookup by phone fails

**Cause**: Phone number stored in wrong format

**Fix**: Update clinic record
```graphql
mutation UpdateClinic {
  updateClinic(input: {
    id: "clinic-8585810708"
    phone: "+918585810708"  # Ensure E.164 format
  }) {
    id
    phone
  }
}
```

---

## Step 3: Verify Fix

After applying any fix:

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Reload dashboard**: http://localhost:3000/dashboard
3. **Check sync status** (top-right corner):
   - 🟢 Synced = Fixed!
   - 🟠 Local Only = Still broken
4. **Check console logs**:
   - Look for `[Dashboard] ✓ Found by userId`
   - Should show clinic data

---

## Step 4: Prevent Future Issues

### During Signup

Ensure the signup flow creates the clinic correctly:

**File**: `src/app/login/page.tsx`

Check that `ensureClinicRecord` is called:
```typescript
// Step 2: Create clinic record
await ensureClinicRecord(normalizedMobile, clinicName, smsSuffix);
```

And that it uses the correct ID format:
```typescript
const clinicId = generateClinicIdFromMobile(normalized);
// Returns: "clinic-8585810708"
```

### During Login

Ensure localStorage session is set correctly:

**File**: `src/app/login/page.tsx`

Check `setLocalSession` call:
```typescript
setLocalSession({
    userId: clinicId,  // Must be "clinic-XXXXXXXXXX"
    username: clinicDisplayName,
    mobile: mobileAsE164(normalizedMobile),
});
```

---

## Quick Test Checklist

- [ ] Open debug page: http://localhost:3000/dashboard/debug
- [ ] Check userId format (should have "clinic-" prefix)
- [ ] Click "Test Debug API" button
- [ ] Verify at least one attempt shows `success: true`
- [ ] Check dashboard shows 🟢 Synced status
- [ ] Verify clinic name is correct (not "Clinic 0708")

---

## Still Not Working?

### Collect Debug Info

1. **Screenshot of debug page**
2. **Browser console logs** (F12 → Console tab)
3. **Network tab** (F12 → Network → Filter: graphql)
4. **localStorage data**:
   ```javascript
   console.log(localStorage.getItem('vizzi_auth_session'));
   ```

### Check These Files

1. `amplify_outputs.json` - AppSync configuration
2. `src/app/login/page.tsx` - Signup flow
3. `src/app/dashboard/page.tsx` - Clinic lookup logic
4. `.env.local` - Environment variables

### Common Environment Issues

**Missing Environment Variables**:
```bash
# Check .env.local has these:
AWS_REGION=ap-south-1
AWS_USER_POOL_ID=ap-south-1_0byWYlztF
AWS_APPSYNC_API_URL=...
AWS_APPSYNC_API_KEY=...
```

**Wrong Region**:
- Ensure all AWS resources are in `ap-south-1`
- Check `amplify_outputs.json` has correct region

---

## Summary

The error `[Dashboard] ✗ userId failed: {}` means:

1. **Dashboard tried to fetch clinic** from AppSync
2. **Got empty response** (not an error, just no data)
3. **Clinic either doesn't exist** or ID format is wrong

**Most Common Fix**: Re-signup with same mobile number to create clinic record

**Quick Fix**: Use debug page to identify exact issue, then apply appropriate fix

**Prevention**: Ensure signup flow creates clinic with correct ID format
