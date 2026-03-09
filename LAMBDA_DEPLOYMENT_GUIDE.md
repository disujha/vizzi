# Lambda Functions Deployment Guide

## Overview
This guide will help you deploy the three Lambda functions required for Cognito Custom Auth with MSG91 OTP.

## Current Status
✅ AppSync API deployed: `wbcw3zak3nfo5lhxpv2jxjqzye.appsync-api.ap-south-1.amazonaws.com`
✅ Cognito User Pool: `ap-south-1_0byWYlztF`
✅ Region: `ap-south-1` (Mumbai)
⚠️ Lambda triggers: NOT YET CONFIGURED

## Lambda Functions to Deploy

1. **defineAuthChallenge** - Controls the auth flow
2. **createAuthChallenge** - Generates and sends OTP via MSG91
3. **verifyAuthChallenge** - Verifies OTP with MSG91

## Deployment Steps

### Step 1: Prepare Lambda Package

```bash
cd artifacts/lambda

# Create deployment package
zip -r lambda-deployment.zip *.js package.json
```

### Step 2: Create IAM Role for Lambda

The Lambda functions need an execution role with these permissions:
- CloudWatch Logs (for logging)
- Cognito User Pool access (for user operations)

```bash
# Create trust policy file
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name VizziCognitoLambdaRole \
  --assume-role-policy-document file://trust-policy.json \
  --region ap-south-1

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name VizziCognitoLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --region ap-south-1
```

### Step 3: Deploy Lambda Functions

```bash
# Set environment variables
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY

# Get the role ARN (replace with your account ID)
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/VizziCognitoLambdaRole"

# Deploy defineAuthChallenge
aws lambda create-function \
  --function-name vizzi-defineAuthChallenge \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler defineAuthChallenge.handler \
  --zip-file fileb://lambda-deployment.zip \
  --region ap-south-1 \
  --timeout 10 \
  --memory-size 256

# Deploy createAuthChallenge
aws lambda create-function \
  --function-name vizzi-createAuthChallenge \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler createAuthChallenge.handler \
  --zip-file fileb://lambda-deployment.zip \
  --region ap-south-1 \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={MSG91_AUTH_KEY=462703A7BdGmwT2m68b928c3P1,MSG91_TEMPLATE_ID=69aa30f6f17f92c8ae010052}"

# Deploy verifyAuthChallenge  
aws lambda create-function \
  --function-name vizzi-verifyAuthChallenge \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler verifyAuthChallenge.handler \
  --zip-file fileb://lambda-deployment.zip \
  --region ap-south-1 \
  --timeout 30 \
  --memory-size 512 \
  --environment "Variables={MSG91_AUTH_KEY=462703A7BdGmwT2m68b928c3P1}"
```

### Step 4: Grant Cognito Permission to Invoke Lambda

```bash
# Get User Pool ARN
USER_POOL_ARN="arn:aws:cognito-idp:ap-south-1:163985745933:userpool/ap-south-1_0byWYlztF"

# Grant permissions for each function
aws lambda add-permission \
  --function-name vizzi-defineAuthChallenge \
  --statement-id CognitoInvoke \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn $USER_POOL_ARN \
  --region ap-south-1

aws lambda add-permission \
  --function-name vizzi-createAuthChallenge \
  --statement-id CognitoInvoke \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn $USER_POOL_ARN \
  --region ap-south-1

aws lambda add-permission \
  --function-name vizzi-verifyAuthChallenge \
  --statement-id CognitoInvoke \
  --action lambda:InvokeFunction \
  --principal cognito-idp.amazonaws.com \
  --source-arn $USER_POOL_ARN \
  --region ap-south-1
```

### Step 5: Attach Lambda Triggers to Cognito User Pool

```bash
# Get Lambda ARNs
DEFINE_ARN="arn:aws:lambda:ap-south-1:163985745933:function:vizzi-defineAuthChallenge"
CREATE_ARN="arn:aws:lambda:ap-south-1:163985745933:function:vizzi-createAuthChallenge"
VERIFY_ARN="arn:aws:lambda:ap-south-1:163985745933:function:vizzi-verifyAuthChallenge"

# Update User Pool with Lambda triggers
aws cognito-idp update-user-pool \
  --user-pool-id ap-south-1_0byWYlztF \
  --lambda-config \
    DefineAuthChallenge=$DEFINE_ARN,\
CreateAuthChallenge=$CREATE_ARN,\
VerifyAuthChallengeResponse=$VERIFY_ARN \
  --region ap-south-1
```

### Step 6: Update App Client to Allow CUSTOM_AUTH

```bash
# First, get the current app client configuration
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-south-1_0byWYlztF \
  --client-id 6r4ihia5ehfefpgc8nfmi50cdv \
  --region ap-south-1

# Update to allow CUSTOM_AUTH
aws cognito-idp update-user-pool-client \
  --user-pool-id ap-south-1_0byWYlztF \
  --client-id 6r4ihia5ehfefpgc8nfmi50cdv \
  --explicit-auth-flows ALLOW_CUSTOM_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region ap-south-1
```

## Alternative: Deploy via AWS Console

### Step 1: Create Lambda Functions
1. Go to AWS Lambda Console (ap-south-1 region)
2. Click "Create function"
3. Choose "Author from scratch"
4. Function name: `vizzi-defineAuthChallenge`
5. Runtime: Node.js 20.x
6. Create function
7. Upload the zip file or paste code from `artifacts/lambda/defineAuthChallenge.js`
8. Repeat for the other two functions

### Step 2: Set Environment Variables
For `vizzi-createAuthChallenge` and `vizzi-verifyAuthChallenge`:
- MSG91_AUTH_KEY: `462703A7BdGmwT2m68b928c3P1`
- MSG91_TEMPLATE_ID: `69aa30f6f17f92c8ae010052` (only for createAuthChallenge)

### Step 3: Attach to Cognito
1. Go to Amazon Cognito Console
2. Select User Pool: `ap-south-1_0byWYlztF`
3. Go to "User pool properties" → "Lambda triggers"
4. Add triggers:
   - Define auth challenge: `vizzi-defineAuthChallenge`
   - Create auth challenge: `vizzi-createAuthChallenge`
   - Verify auth challenge response: `vizzi-verifyAuthChallenge`
5. Save changes

### Step 4: Enable CUSTOM_AUTH
1. In Cognito User Pool, go to "App integration"
2. Select your app client
3. Edit "Authentication flows"
4. Enable: `ALLOW_CUSTOM_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`
5. Save changes

## Testing

After deployment, test the flow:

```bash
# Test login flow
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"initiateAuth","mobile":"9876543210"}'

# You should receive an OTP on the mobile number
# Then verify:
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"verifyOtp","mobile":"9876543210","otp":"1234","session":"<session_from_previous_response>"}'
```

## Troubleshooting

### Check Lambda Logs
```bash
aws logs tail /aws/lambda/vizzi-createAuthChallenge --follow --region ap-south-1
```

### Common Issues

1. **"User not found" error**
   - User needs to be created in Cognito first
   - Or implement auto-signup in Lambda

2. **MSG91 API fails**
   - Check environment variables are set
   - Verify MSG91 API key is valid
   - Check mobile number format (91XXXXXXXXXX)

3. **Lambda timeout**
   - Increase timeout to 30 seconds
   - Check network connectivity to MSG91

4. **Permission denied**
   - Verify Lambda execution role has correct permissions
   - Check Cognito has permission to invoke Lambda

## Verification Checklist

- [ ] Lambda functions deployed in ap-south-1
- [ ] Environment variables set (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)
- [ ] Lambda execution role created with CloudWatch Logs permission
- [ ] Cognito has permission to invoke Lambda functions
- [ ] Lambda triggers attached to User Pool
- [ ] App client allows CUSTOM_AUTH flow
- [ ] Test OTP generation works
- [ ] Test OTP verification works
- [ ] Frontend can successfully login

## Next Steps

After Lambda deployment:
1. Update `amplify_outputs.json` with correct configuration
2. Test complete signup/login flow
3. Monitor CloudWatch logs for any errors
4. Set up CloudWatch alarms for Lambda failures
