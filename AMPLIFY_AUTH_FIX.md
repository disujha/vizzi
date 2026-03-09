# AWS Amplify Authentication Fix

## Problem Summary

**Errors Encountered**:
1. **Signup**: "Could not load credentials from any providers"
2. **Login**: "Invalid username, OTP, or secret hash"

**Root Cause**: AWS SDK in the application requires AWS credentials to interact with Cognito, but these credentials are not configured in the AWS Amplify deployment environment.

---

## Solution: Add Environment Variables to Amplify

You need to add the following environment variables to your AWS Amplify deployment.

### Step-by-Step Instructions

#### 1. Open AWS Amplify Console
- Go to: https://console.aws.amazon.com/amplify/
- Sign in with your AWS account
- Select your app (should be named "vizzi" or similar)

#### 2. Navigate to Environment Variables
- In the left sidebar, click **App settings**
- Click **Environment variables**
- Click **Manage variables** button

#### 3. Add These Variables

Click **Add variable** for each of the following:

**Note**: AWS Amplify restricts environment variables starting with "AWS_" prefix. We use alternative prefixes (COGNITO_, BEDROCK_) that the application code supports as fallbacks.

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `COGNITO_REGION` | `ap-south-1` | AWS region for Cognito |
| `COGNITO_USER_POOL_ID` | `ap-south-1_0byWYlztF` | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | `1oqlon9kgthoerfqkm06iuonla` | Cognito App Client ID |
| `BEDROCK_ACCESS_KEY_ID` | `[YOUR_AWS_ACCESS_KEY]` | AWS Access Key (from .env.local) |
| `BEDROCK_SECRET_ACCESS_KEY` | `[YOUR_AWS_SECRET_KEY]` | AWS Secret Key (from .env.local) |
| `MSG91_AUTH_KEY` | `462703A7BdGmwT2m68b928c3P1` | MSG91 API Key for SMS |
| `MSG91_TEMPLATE_OTP` | `69aa30f6f17f92c8ae010052` | MSG91 OTP Template ID |

**Note**: Replace `[YOUR_AWS_ACCESS_KEY]` and `[YOUR_AWS_SECRET_KEY]` with the actual values from your `.env.local` file.

#### 4. Save Changes
- Click **Save** button at the bottom
- Amplify will automatically save the variables

#### 5. Redeploy the Application
- Go to the **main** branch in the Amplify console
- Click **Redeploy this version** button
- Wait for the build to complete (usually 3-5 minutes)
- Monitor the build logs for any errors

---

## Visual Guide

### Adding Environment Variables

```
AWS Amplify Console
└── Your App (vizzi)
    └── App settings (left sidebar)
        └── Environment variables
            └── Manage variables
                └── Add variable (button)
                    ├── Variable name: AWS_REGION
                    ├── Value: ap-south-1
                    └── Save
```

### Screenshot Reference

When you're in the Environment Variables section, you should see:
- A table with columns: "Variable name" and "Value"
- An "Add variable" button
- A "Save" button at the bottom

---

## Verification Steps

After redeployment completes:

### Test 1: Signup Flow
1. Go to https://main.dqkr5hog6v2v4.amplifyapp.com/
2. Click "Start Free Trial" or navigate to `/login?mode=signup`
3. Enter:
   - Clinic Name: "Test Clinic"
   - Mobile Number: Your 10-digit mobile number
4. Click "Send OTP"
5. **Expected**: You should receive an SMS with OTP
6. Enter the OTP
7. **Expected**: Successfully logged in and redirected to dashboard

### Test 2: Login Flow
1. Go to https://main.dqkr5hog6v2v4.amplifyapp.com/login
2. Enter your mobile number (that you used for signup)
3. Click "Send OTP"
4. **Expected**: You should receive an SMS with OTP
5. Enter the OTP
6. **Expected**: Successfully logged in and redirected to dashboard

---

## Troubleshooting

### Issue: Still getting "Could not load credentials"

**Possible Causes**:
1. Environment variables not saved properly
2. Application not redeployed after adding variables
3. Build failed during deployment

**Solutions**:
1. Double-check all variable names (case-sensitive!)
2. Verify all values are correct (no extra spaces)
3. Click "Redeploy this version" again
4. Check build logs for errors:
   - Go to your app in Amplify console
   - Click on the latest build
   - Review "Build" and "Deploy" logs

### Issue: "Invalid username, OTP, or secret hash"

**Possible Causes**:
1. User doesn't exist in Cognito User Pool
2. Wrong User Pool Client ID
3. Lambda triggers not configured properly

**Solutions**:
1. Try signup first (creates user in Cognito)
2. Verify `AWS_USER_POOL_CLIENT_ID` is correct
3. Check Cognito User Pool in AWS Console:
   - Go to https://console.aws.amazon.com/cognito/
   - Select User Pool: `ap-south-1_0byWYlztF`
   - Check if user exists under "Users" tab

### Issue: OTP not received

**Possible Causes**:
1. MSG91 credentials incorrect
2. MSG91 account has no credits
3. Mobile number format issue

**Solutions**:
1. Verify MSG91 credentials in environment variables
2. Check MSG91 dashboard: https://control.msg91.com/
3. Ensure mobile number is 10 digits (no +91 prefix)
4. Check MSG91 SMS logs for delivery status

### Issue: Build fails after adding environment variables

**Possible Causes**:
1. Syntax error in environment variable values
2. Missing required variables
3. Build configuration issue

**Solutions**:
1. Check build logs in Amplify console
2. Verify all required variables are added
3. Ensure no special characters in variable values (except the actual values)
4. Try redeploying again

---

## Alternative: Using AWS CLI

If you prefer command line, you can add environment variables using AWS CLI:

```bash
# Get your Amplify App ID
aws amplify list-apps --region ap-south-1

# Add environment variables
aws amplify update-app \
  --app-id YOUR_APP_ID \
  --region ap-south-1 \
  --environment-variables \
    COGNITO_REGION=ap-south-1,\
    COGNITO_USER_POOL_ID=ap-south-1_0byWYlztF,\
    COGNITO_CLIENT_ID=1oqlon9kgthoerfqkm06iuonla,\
    BEDROCK_ACCESS_KEY_ID=[YOUR_AWS_ACCESS_KEY],\
    BEDROCK_SECRET_ACCESS_KEY=[YOUR_AWS_SECRET_KEY],\
    MSG91_AUTH_KEY=462703A7BdGmwT2m68b928c3P1,\
    MSG91_TEMPLATE_OTP=69aa30f6f17f92c8ae010052

# Trigger redeploy
aws amplify start-job \
  --app-id YOUR_APP_ID \
  --branch-name main \
  --job-type RELEASE \
  --region ap-south-1
```

---

## Security Recommendations

### ⚠️ IMPORTANT: Rotate AWS Credentials

The AWS credentials in this document are now exposed. After setting up Amplify, you should:

1. **Create a new IAM user** with minimal permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cognito-idp:AdminCreateUser",
           "cognito-idp:AdminSetUserPassword",
           "cognito-idp:InitiateAuth",
           "cognito-idp:RespondToAuthChallenge"
         ],
         "Resource": "arn:aws:cognito-idp:ap-south-1:*:userpool/ap-south-1_0byWYlztF"
       }
     ]
   }
   ```

2. **Generate new access keys** for the new IAM user

3. **Update Amplify environment variables** with new credentials

4. **Delete the old IAM user** or rotate its keys

### Better Alternative: Use IAM Roles

Instead of using access keys, configure an IAM role for Amplify:

1. Create an IAM role with the permissions above
2. Attach the role to your Amplify app
3. Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` from environment variables
4. AWS SDK will automatically use the role credentials

---

## Expected Behavior After Fix

### Signup Flow
```
User enters clinic name + mobile
    ↓
Click "Send OTP"
    ↓
API calls Cognito to create user
    ↓
Lambda trigger sends OTP via MSG91
    ↓
User receives SMS with 6-digit OTP
    ↓
User enters OTP
    ↓
Cognito verifies OTP
    ↓
User logged in → Dashboard
```

### Login Flow
```
User enters mobile number
    ↓
Click "Send OTP"
    ↓
API calls Cognito to initiate auth
    ↓
Lambda trigger sends OTP via MSG91
    ↓
User receives SMS with 6-digit OTP
    ↓
User enters OTP
    ↓
Cognito verifies OTP
    ↓
User logged in → Dashboard
```

---

## Quick Checklist

- [ ] Open AWS Amplify Console
- [ ] Navigate to Environment Variables
- [ ] Add all 7 environment variables
- [ ] Save changes
- [ ] Redeploy application
- [ ] Wait for build to complete
- [ ] Test signup with new mobile number
- [ ] Test login with existing mobile number
- [ ] Verify OTP delivery
- [ ] Confirm successful authentication
- [ ] (Optional) Rotate AWS credentials for security

---

## Support Resources

- **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
- **AWS Cognito Console**: https://console.aws.amazon.com/cognito/
- **MSG91 Dashboard**: https://control.msg91.com/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/
- **GitHub Repository**: https://github.com/disujha/vizzi

---

## Status

**Current Status**: ❌ Environment variables not configured
**After Fix**: ✅ Authentication should work properly

**Last Updated**: March 9, 2026
