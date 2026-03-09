# Test AppSync Connection Fix

## What I Fixed

**Problem**: AppSync client was trying to use Cognito authentication but had no credentials, causing "No current user" error.

**Solution**: Updated `src/lib/amplify.ts` to explicitly use API_KEY authentication mode.

## Changes Made

### Before (src/lib/amplify.ts)
```typescript
// Complex logic trying to determine auth type
const authType = (process.env.NEXT_PUBLIC_AWS_APPSYNC_AUTH_TYPE || config.aws_appsync_authenticationType || "").toUpperCase();
const defaultAuthMode = authType === "API_KEY" ? "apiKey" : "userPool";
// Conditionally adding Auth config
```

### After (src/lib/amplify.ts)
```typescript
// Simple, explicit configuration using amplify_outputs.json
Amplify.configure({
    API: {
        GraphQL: {
            endpoint: outputs.data.url,
            region: outputs.data.aws_region,
            defaultAuthMode: "apiKey",  // ← Explicitly set to apiKey
            apiKey: outputs.data.api_key,
        },
    },
    Auth: {
        Cognito: { ... }  // Still configured for login
    },
}, {
    ssr: true  // Enable SSR support
});
```

## Test Now

### Step 1: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

### Step 3: Test Debug API Again
1. Go to: http://localhost:3000/dashboard/debug
2. Click "Test Debug API" button
3. Check the response

### Expected Result (Success)
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
      "success": false,  // ← Still false (clinic doesn't exist)
      "error": null      // ← But NO authentication error
    },
    {
      "method": "List by phone filter",
      "success": true,   // ← Should work now
      "count": 0,        // ← 0 because clinic doesn't exist yet
      "data": []
    },
    {
      "method": "List all clinics",
      "success": true,   // ← Should work now
      "count": 0,        // ← 0 or shows other clinics
      "data": []
    }
  ]
}
```

The key difference:
- **Before**: "No current user" / "No credentials" errors
- **After**: Queries work, just return empty results (because clinic doesn't exist)

### Step 4: Create Clinic Record

Once the API connection works, you need to create the clinic:

**Option A: Re-signup** (Recommended)
1. Logout
2. Go to login page
3. Signup with: "test clinic" + mobile 8585810708
4. Complete OTP

**Option B: Manual Creation via AWS Console**
1. Go to AWS AppSync console
2. Select your API
3. Run this mutation:

```graphql
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
    smsLimit: 100
    smsUsed: 0
  }) {
    id
    clinicName
  }
}
```

### Step 5: Verify Dashboard
1. Go to: http://localhost:3000/dashboard
2. Check sync status (top-right)
3. Should show: 🟢 **Synced**
4. Clinic name should be: **test clinic**

## Why This Happened

The old configuration was trying to be "smart" and auto-detect the auth type, but it was:
1. Reading from multiple sources (env vars, config files)
2. Sometimes defaulting to wrong auth mode
3. Not explicitly setting API key

The new configuration:
1. Uses the official `amplify_outputs.json` format
2. Explicitly sets `defaultAuthMode: "apiKey"`
3. Always includes the API key
4. Simpler and more reliable

## Troubleshooting

### If Still Getting "No current user" Error

Check browser console for:
```
[Amplify] Configured with API_KEY auth mode
```

If you don't see this, the configuration didn't load properly.

### If Getting "API Key Expired" Error

The API key in `amplify_outputs.json` might be expired. Regenerate:
```bash
npx ampx sandbox
```

### If Getting CORS Error

AppSync CORS settings might need updating. Check AWS AppSync console.

## Summary

✅ Fixed Amplify configuration to use API_KEY auth
✅ Simplified configuration using amplify_outputs.json
✅ Added SSR support
✅ Added console logging for debugging

Next step: Test the debug API again and create the clinic record!
