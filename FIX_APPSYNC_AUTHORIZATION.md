# Fix AppSync Authorization Issue

## Problem
```
"errorType": "Unauthorized"
"message": "Not Authorized to access getClinic on type Query"
```

The API_KEY doesn't have permission to access AppSync queries.

## Root Cause

The Amplify backend schema has authorization rules, but they're not deployed or the API key doesn't have the right permissions.

## Solution: Deploy Amplify Backend

### Option 1: Start Amplify Sandbox (Recommended)

This will deploy your backend with the correct authorization:

```bash
npx ampx sandbox
```

This command will:
1. Deploy your AppSync API with correct authorization
2. Generate a new API key with proper permissions
3. Update `amplify_outputs.json` with new credentials
4. Watch for changes and auto-deploy

**Leave it running** while you develop. It will keep your backend in sync.

### Option 2: One-time Deployment

If you don't want to keep it running:

```bash
npx ampx sandbox --once
```

This deploys once and exits.

---

## After Deployment

### Step 1: Restart Dev Server

After Amplify sandbox deploys:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 2: Test Debug API

Go to: http://localhost:3000/dashboard/debug

Click "Test Debug API" - should now show:
```json
{
  "attempts": [
    {
      "method": "Direct ID lookup",
      "success": false,  // Still false (clinic doesn't exist)
      "error": null      // But NO authorization error!
    },
    {
      "method": "List all clinics",
      "success": true,   // ✅ Works now!
      "count": 0,
      "data": []
    }
  ]
}
```

### Step 3: Create Clinic

Now that authorization works, create the clinic:

**Re-signup**:
1. Logout
2. Go to login page
3. Signup: "test clinic" + 8585810708
4. Complete OTP

This will create the clinic in AppSync.

### Step 4: Verify Dashboard

Go to: http://localhost:3000/dashboard

Should show:
- 🟢 **Synced** (top-right)
- Clinic name: **test clinic**

---

## Alternative: Manual API Key Fix

If you can't run `ampx sandbox`, you can manually update the API key permissions in AWS AppSync console:

### Steps:

1. **Go to AWS AppSync Console**
   - Region: ap-south-1 (Mumbai)
   - Select your API

2. **Go to Settings**
   - Find "API Keys" section
   - Check if key `da2-fpcxwzzvofc27pxphlvpjdx2za` exists
   - Check expiration date

3. **Create New API Key** (if expired)
   - Click "Create API Key"
   - Set expiration: 365 days
   - Copy the new key

4. **Update amplify_outputs.json**
   ```json
   {
     "data": {
       "api_key": "NEW_KEY_HERE"
     }
   }
   ```

5. **Restart dev server**

---

## Why This Happened

The AppSync API was created but:
1. Authorization rules weren't deployed properly
2. API key might have expired
3. Schema changes weren't pushed to AWS

Running `ampx sandbox` ensures everything is in sync.

---

## Expected Timeline

1. **Run `npx ampx sandbox`**: 2-3 minutes (first time)
2. **Wait for deployment**: "Deployed" message appears
3. **Restart dev server**: 10 seconds
4. **Test debug API**: Should work now
5. **Re-signup**: 1 minute
6. **Dashboard synced**: ✅ Done!

**Total time**: ~5 minutes

---

## Troubleshooting

### If `ampx sandbox` fails

**Error**: "No AWS credentials"
**Fix**: Configure AWS CLI
```bash
aws configure
# Enter your AWS credentials
```

**Error**: "Region not found"
**Fix**: Set region
```bash
export AWS_REGION=ap-south-1
```

### If authorization still fails after deployment

Check `amplify_outputs.json`:
```json
{
  "data": {
    "api_key": "da2-...",  // Should be a valid key
    "default_authorization_type": "API_KEY"  // Should be API_KEY
  }
}
```

If `api_key` is missing or `default_authorization_type` is wrong, the deployment didn't complete properly.

---

## Summary

**Current Issue**: API_KEY doesn't have permission to access AppSync

**Solution**: Run `npx ampx sandbox` to deploy backend with correct authorization

**After Fix**: 
- ✅ Debug API works (no authorization errors)
- ✅ Can create clinic via re-signup
- ✅ Dashboard syncs with backend
- ✅ Shows 🟢 Synced status

Run the sandbox command and let me know when it's deployed!
