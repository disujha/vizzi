# Next Steps - Test the Authorization Fix

## What I Fixed

Changed AppSync authentication from API_KEY to Cognito User Pool authentication. This should resolve the "Not Authorized" errors you were seeing.

## Test It Now

### Step 1: Test AppSync Connection
1. Make sure you're logged in to the dashboard
2. Navigate to: `http://localhost:3000/dashboard/test-appsync`
3. Click "Test AppSync Queries"
4. Check the results:
   - ✓ Green = Success (queries work with Cognito auth)
   - ✗ Red = Still failing (need to investigate further)

### Step 2: Check Results

**If you see "Success" (green):**
- Great! Cognito authentication is working
- The queries might return empty results (no clinic data yet)
- This is expected - we need to create clinic data

**If you still see "Not Authorized" errors:**
- The schema might not have `allow.authenticated()` rules deployed
- We may need to redeploy the sandbox
- Or manually update the AppSync schema in AWS Console

### Step 3: Create Clinic Data (If Queries Work)

Once queries work, create clinic data by:

**Option A: Re-signup (Recommended)**
```
1. Logout from dashboard
2. Go to signup page
3. Enter mobile: 8585810708
4. Complete signup flow
5. This will create clinic in AppSync
```

**Option B: Use Debug API**
```
Create a mutation to insert clinic data directly
```

### Step 4: Verify Dashboard
After creating clinic data:
- Dashboard should show 🟢 Synced
- Clinic name should load from AppSync
- No more "Local Only" warnings

## What Changed

### Before (API_KEY Auth)
```typescript
defaultAuthMode: "apiKey",
apiKey: outputs.data.api_key,
```
- Used shared API key for all requests
- Schema wasn't deployed with API_KEY permissions
- Got "Not Authorized" errors

### After (Cognito Auth)
```typescript
defaultAuthMode: "userPool",
```
- Uses logged-in user's Cognito token
- More secure and production-ready
- Should work immediately (no schema deployment needed)

## If Still Having Issues

### Check 1: User is Logged In
```javascript
// In browser console
localStorage.getItem('authSession')
// Should show user data
```

### Check 2: Cognito Token Exists
```javascript
// The Amplify library should have a valid token
// If not, try logging out and back in
```

### Check 3: Schema Has Authenticated Rules
The schema already has this (verified):
```typescript
.authorization((allow) => [
  allow.authenticated().to(['create', 'read', 'update']),
])
```

### Check 4: AppSync Authorization Modes
AWS Console → AppSync → Settings → Authorization:
- Should have "Amazon Cognito User Pool" enabled
- User Pool ID should match: `ap-south-1_0byWYlztF`

## Alternative: Stick with Firebase

If AppSync continues to have issues, you can:
1. Keep using Firebase + localStorage (already working)
2. Remove AppSync integration
3. Focus on Firebase as the backend

The dashboard already has fallback logic, so everything works even if AppSync fails.

## Questions to Answer

1. **Do the test queries work?** (green success messages)
2. **Do you want to use AWS AppSync or stick with Firebase?**
3. **Should we create clinic data via re-signup or manual mutation?**

Let me know the test results and we'll proceed from there!
