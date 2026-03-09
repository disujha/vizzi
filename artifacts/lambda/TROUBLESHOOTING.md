# Cognito Lambda Trigger Troubleshooting

## Error: "Custom auth lambda trigger is not configured for the user pool"

### Common Causes & Solutions

## 1. Lambda Function Names Don't Match
**Problem**: The function names in AWS don't match what you configured in Cognito.

**Solution**:
- Check your exact Lambda function names in AWS Lambda Console
- In Cognito Console → User Pool → App Integration → Triggers, ensure the dropdown shows the correct function names
- Common naming issues:
  - `vizzi-defineAuthChallenge` vs `defineAuthChallenge`
  - `vizzi_createAuthChallenge` vs `createAuthChallenge`
  - Extra spaces or special characters

## 2. Lambda Functions Not Deployed
**Problem**: Functions exist in code but not actually deployed to AWS.

**Solution**:
- Go to AWS Lambda Console
- Verify all three functions exist:
  - `vizzi-defineAuthChallenge`
  - `vizzi-createAuthChallenge` 
  - `vizzi-verifyAuthChallengeResponse`
- If not present, create them using the code from `artifacts/lambda/`

## 3. Missing Lambda Permissions
**Problem**: Cognito doesn't have permission to invoke the Lambda functions.

**Solution**:
- Go to each Lambda function → Configuration → Permissions
- Ensure the policy includes `cognito-idp.amazonaws.com` as a trusted service
- Or add this policy manually:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cognito-idp.amazonaws.com"
      },
      "Action": "lambda:InvokeFunction",
      "Resource": "arn:aws:lambda:*:*:function:vizzi-*"
    }
  ]
}
```

## 4. Incorrect Trigger Assignment
**Problem**: Triggers assigned to wrong event types.

**Solution**:
In Cognito Console → User Pool → App Integration → Triggers:
- **Define auth challenge** → `vizzi-defineAuthChallenge`
- **Create auth challenge** → `vizzi-createAuthChallenge`
- **Verify auth challenge response** → `vizzi-verifyAuthChallengeResponse`

## 5. User Pool Region Mismatch
**Problem**: Lambda functions and User Pool in different regions.

**Solution**:
- Ensure Lambda functions are in the same AWS region as your Cognito User Pool
- Check both in their respective console URLs

## Quick Verification Steps

### Step 1: Verify Lambda Functions Exist
```bash
# Using AWS CLI
aws lambda list-functions --query 'Functions[?contains(FunctionName, `vizzi`)]'
```

### Step 2: Check Cognito Trigger Configuration
```bash
aws cognito-idp describe-user-pool --user-pool-id YOUR_USER_POOL_ID --query 'UserPool.LambdaConfig'
```

### Step 3: Test Lambda Function Manually
```bash
aws lambda invoke --function-name vizzi-createAuthChallenge output.json --payload '{"userName":"1234567890","request":{"session":[]},"response":{}}'
```

## Debugging Steps

1. **Check CloudWatch Logs** for each Lambda function
2. **Enable Cognito Advanced Security** logging
3. **Test with a simple Lambda** first to ensure connectivity
4. **Verify environment variables** in the createAuthChallenge function

## If Still Not Working

Try creating a minimal test Lambda first:

```javascript
exports.handler = async (event) => {
    console.log('Test trigger invoked:', JSON.stringify(event, null, 2));
    return event;
};
```

Attach this to one trigger to verify the connection works, then replace with the full implementation.
