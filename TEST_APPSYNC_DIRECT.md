# Direct AppSync API Test

## Problem
The AppSync API returns "Not Authorized" errors even though:
- Schema has `allow.publicApiKey()` authorization
- `amplify_outputs.json` has API_KEY configured
- Sandbox was deployed with `npx ampx sandbox`

## Root Cause Analysis

The issue is that the AppSync API schema wasn't properly deployed with public API_KEY permissions. This can happen when:

1. **Schema deployment failed silently** - The sandbox started but schema updates didn't apply
2. **API_KEY permissions not in deployed schema** - The local schema has `allow.publicApiKey()` but the deployed schema doesn't
3. **Wrong API being used** - Multiple AppSync APIs exist and we're using the wrong one

## Current Configuration

From `amplify_outputs.json`:
- API URL: `https://wbcw3zak3nfo5lhxpv2jxjqzye.appsync-api.ap-south-1.amazonaws.com/graphql`
- API Key: `da2-fpcxwzzvofc27pxphlvpjdx2za`
- Default Auth: `API_KEY`

## Solution Options

### Option 1: Verify Schema Deployment (RECOMMENDED)
Check if the schema was actually deployed to AppSync:

1. Go to AWS Console → AppSync → APIs
2. Find API: `wbcw3zak3nfo5lhxpv2jxjqzye`
3. Check Schema tab - verify it has the Clinic, Doctor, QueuePatient types
4. Check Settings → Authorization - verify API_KEY is enabled

### Option 2: Force Schema Redeploy
```bash
# Stop any running sandbox
# Delete .amplify folder to force clean deploy
rm -rf .amplify

# Redeploy sandbox
npx ampx sandbox --once
```

### Option 3: Use Cognito Authentication Instead
Since Cognito is already set up and working, we can switch to using Cognito auth instead of API_KEY:

**Pros:**
- More secure (user-based authentication)
- Already working for signup/login
- Better for production

**Cons:**
- Requires user to be logged in
- More complex setup

### Option 4: Manual AppSync Configuration
If sandbox deployment keeps failing, manually configure AppSync:

1. Go to AWS Console → AppSync
2. Create new API or update existing
3. Import schema from `amplify/data/resource.ts`
4. Enable API_KEY authorization
5. Update `amplify_outputs.json` with new API details

## Recommended Next Steps

1. **First, verify the deployed schema** - Check AWS Console to see if schema is actually there
2. **If schema is missing** - Redeploy with `npx ampx sandbox --once`
3. **If still failing** - Switch to Cognito authentication (more reliable)
4. **Last resort** - Manual AppSync setup via AWS Console

## Testing After Fix

Once fixed, test with:
```bash
curl http://localhost:3000/api/debug-clinic?mobile=8585810708
```

Should return clinic data instead of "Not Authorized" errors.
