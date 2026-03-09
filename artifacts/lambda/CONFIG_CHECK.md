# Cognito Configuration Verification Checklist

## Exact Steps to Verify

### 1. App Client Settings (Double-Check)
1. AWS Cognito → Manage User Pools → **Your User Pool**
2. **App Integration** tab → **App clients** section
3. Click on your app client name (not "Edit")
4. **Scroll down to "Auth flows"** - ensure these are **enabled**:
   - ✅ ALLOW_CUSTOM_AUTH
   - ✅ ALLOW_REFRESH_TOKEN_AUTH
5. **Save** if you made changes

### 2. Lambda Triggers Configuration
1. Still in your User Pool → **App Integration** tab
2. **Lambda triggers** section (scroll down)
3. Verify these are **exactly** set:
   - **Define auth challenge**: `vizzi-defineAuthChallenge`
   - **Create auth challenge**: `vizzi-createAuthChallenge`
   - **Verify auth challenge response**: `vizzi-verifyAuthChallengeResponse`
4. **Save changes**

### 3. Lambda Functions Existence Check
In AWS Lambda Console, verify these functions exist:
- `vizzi-defineAuthChallenge`
- `vizzi-createAuthChallenge`
- `vizzi-verifyAuthChallengeResponse`

### 4. Test with AWS CLI (if available)
```bash
aws cognito-idp describe-user-pool --user-pool-id YOUR_POOL_ID --query 'UserPool.LambdaConfig'
```

### 5. Check App Client ID
Your `amplifyconfiguration.json` should match the App Client ID from Cognito.

## Common Pitfalls

### ❌ Function Name Mismatch
- `vizzi-defineAuthChallenge` vs `defineAuthChallenge`
- Extra spaces or underscores

### ❌ Wrong App Client
- Multiple app clients exist, you're editing the wrong one
- Check the client ID in your amplify config

### ❌ Region Mismatch
- Lambda functions in different region than User Pool

### ❌ Permissions Issue
- Lambda functions don't allow Cognito to invoke them

## Quick Test
Try creating a **new test user pool** with minimal settings to isolate the issue.

## What to Report Back
1. Exact Lambda function names from AWS Lambda Console
2. Screenshot of Lambda triggers configuration in Cognito
3. Your App Client ID from amplify config
4. Any error messages in CloudWatch for the Lambda functions
