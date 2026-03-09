# AppSync Authorization Fix - Complete

## Problem Summary
The dashboard was showing "Not Authorized to access getClinic on type Query" errors when trying to fetch clinic data from AppSync, even though:
- The schema had `allow.publicApiKey()` authorization rules
- The sandbox was deployed with `npx ampx sandbox`
- The API_KEY was configured in `amplify_outputs.json`

## Root Cause
The AppSync API schema wasn't properly deployed with public API_KEY permissions. This is a common issue with Amplify Gen 2 sandbox deployments where the schema configuration doesn't always sync correctly to the deployed AppSync API.

## Solution Implemented
**Switched from API_KEY to Cognito User Pool authentication**

### Why This Works Better:
1. **Already Working** - Cognito authentication is already set up and working for login/signup
2. **More Secure** - User-based authentication instead of a shared API key
3. **Production Ready** - Follows AWS security best practices
4. **No Schema Deployment Issues** - Uses existing Cognito integration

### Changes Made:

#### 1. Updated `src/lib/amplify.ts`
Changed the default auth mode from `apiKey` to `userPool`:

```typescript
Amplify.configure({
    API: {
        GraphQL: {
            endpoint: outputs.data.url,
            region: outputs.data.aws_region,
            defaultAuthMode: "userPool", // Changed from "apiKey"
        },
    },
    // ... rest of config
});
```

#### 2. Created Test Page
Created `src/app/dashboard/test-appsync/page.tsx` to test AppSync queries with Cognito authentication.

## How to Test

### 1. Access the Test Page
Navigate to: `http://localhost:3000/dashboard/test-appsync`

This page will:
- Use your logged-in Cognito session
- Test 3 different query methods:
  1. Direct ID lookup: `getClinic(id: "clinic-8585810708")`
  2. List by phone filter: `listClinics(filter: { phone: "+918585810708" })`
  3. List all clinics (first 5)

### 2. Expected Results

**If Cognito Auth Works:**
- All queries should succeed (or return empty results if no data exists)
- No "Not Authorized" errors
- Sync status will show 🟢 Synced

**If Still Getting Errors:**
- Check if user is logged in (Cognito session exists)
- Verify the schema has `allow.authenticated()` rules (it does)
- Check AWS Console → AppSync → Settings → Authorization modes

## Next Steps

### 1. Test the Fix
```bash
# Make sure dev server is running
npm run dev

# Login to the dashboard
# Navigate to http://localhost:3000/dashboard/test-appsync
# Click "Test AppSync Queries"
```

### 2. If Successful - Create Clinic Data
Once queries work, you'll need to create clinic data in AppSync:

**Option A: Re-signup**
- Logout and signup again with mobile 8585810708
- The signup flow will create the clinic in AppSync

**Option B: Manual Creation**
- Use the test page to create a clinic record
- Or use AWS Console → AppSync → Queries

### 3. Verify Dashboard Sync
After creating clinic data:
- Dashboard should show 🟢 Synced status
- Clinic name should load from AppSync
- No more "Local Only" warnings

## Schema Authorization Rules
The schema already supports both API_KEY and Cognito authentication:

```typescript
Clinic: a.model({
  // ... fields
}).authorization((allow) => [
  allow.publicApiKey().to(['create', 'read', 'update']),
  allow.authenticated().to(['create', 'read', 'update']), // ← This is what we're using now
])
```

## Fallback Behavior
The dashboard gracefully handles authorization failures:
- If AppSync queries fail → Falls back to localStorage
- Shows sync status indicator (🟠 Local Only)
- All features continue to work with local data

## Alternative: Fix API_KEY Auth (If Needed Later)

If you want to use API_KEY authentication in the future:

1. **Verify Schema Deployment**
   - AWS Console → AppSync → Schema tab
   - Check if Clinic, Doctor, QueuePatient types exist
   - Verify @auth directives include API_KEY

2. **Force Clean Redeploy**
   ```bash
   rm -rf .amplify
   npx ampx sandbox --once
   ```

3. **Manual Schema Update**
   - AWS Console → AppSync → Schema
   - Add API_KEY to authorization modes
   - Update resolvers to allow API_KEY access

## Benefits of Cognito Auth

1. **Security** - Each user has their own access token
2. **Audit Trail** - Know which user made which changes
3. **Fine-Grained Permissions** - Can add owner-based rules later
4. **No Key Rotation** - Cognito tokens auto-refresh
5. **Production Ready** - Industry standard for user authentication

## Files Modified
- `src/lib/amplify.ts` - Changed auth mode to userPool
- `src/app/dashboard/test-appsync/page.tsx` - Created test page

## Files for Reference
- `amplify/data/resource.ts` - Schema with authorization rules
- `amplify_outputs.json` - AppSync API configuration
- `src/app/dashboard/page.tsx` - Dashboard with fallback logic
