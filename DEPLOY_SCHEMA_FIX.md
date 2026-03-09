# Deploy Schema Fix for Cloud Sync

## Problem
The deployed AppSync schema is missing fields that the local code is trying to update:
- `voiceEnabled`
- `tokenPrefix`
- And possibly other fields

Error message:
```
Unauthorized on [voiceEnabled, tokenPrefix]
```

This is not an authorization issue - these fields simply don't exist in the deployed schema yet.

## Solution
Deploy the updated Amplify schema to AWS.

### Steps to Deploy:

1. **Check your current Amplify environment:**
   ```bash
   npx ampx sandbox list
   ```

2. **Deploy the schema to your sandbox:**
   ```bash
   npx ampx sandbox
   ```
   
   This will:
   - Deploy the updated schema with all fields
   - Update the AppSync API
   - Generate new `amplify_outputs.json`

3. **Or deploy to production:**
   ```bash
   npx ampx pipeline-deploy --branch main --app-id dqkr5hog6v2v4
   ```

### Verify Deployment:

After deployment, check the AppSync console:
1. Go to https://console.aws.amazon.com/appsync/
2. Select your API
3. Go to "Schema" tab
4. Verify that the `Clinic` type includes:
   - `voiceEnabled: Boolean`
   - `tokenPrefix: String`
   - `tokenDigits: Int`
   - All other fields from `amplify/data/resource.ts`

### Temporary Workaround (Already Implemented):

The code now has a fallback that only updates `name` and `clinicName` fields directly, avoiding the schema mismatch. This allows clinic name updates to work even before schema deployment.

However, other settings (voice, tokens, etc.) will still fail until the schema is deployed.

## Files in This Repo:

The schema file `amplify/data/resource.ts` already has all the correct fields. It just needs to be deployed to AWS.

## After Deployment:

Once deployed, all settings should sync properly to AppSync without any "Unauthorized" errors.
