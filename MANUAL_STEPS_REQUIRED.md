# ⚠️ MANUAL STEPS REQUIRED (5 Minutes)

## Quick Reference - Complete These Steps Now

### 🔗 AWS Console Links

**Direct Link to Cognito User Pool:**
https://ap-south-1.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-south-1_0byWYlztF/lambda-triggers

**Direct Link to App Client:**
https://ap-south-1.console.aws.amazon.com/cognito/v2/idp/user-pools/ap-south-1_0byWYlztF/app-integration/clients/6r4ihia5ehfefpgc8nfmi50cdv

---

## Step 1: Attach Lambda Triggers (2 minutes)

1. Click the first link above (Lambda triggers)
2. Click **"Add Lambda trigger"** or **"Edit"**
3. Configure these triggers:

| Trigger Type | Lambda Function |
|-------------|-----------------|
| Define auth challenge | `vizzi-defineAuthChallenge` |
| Create auth challenge | `vizzi-createAuthChallenge` |
| Verify auth challenge response | `vizzi-verifyAuthChallenge` |

4. Click **"Save changes"**

---

## Step 2: Enable CUSTOM_AUTH Flow (2 minutes)

1. Click the second link above (App client)
2. Scroll to **"Authentication flows"**
3. Click **"Edit"**
4. Enable these checkboxes:
   - ✅ **ALLOW_CUSTOM_AUTH**
   - ✅ **ALLOW_REFRESH_TOKEN_AUTH**
5. Click **"Save changes"**

---

## Step 3: Verify Configuration (1 minute)

### Check Lambda Triggers
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id ap-south-1_0byWYlztF \
  --region ap-south-1 \
  --query 'UserPool.LambdaConfig'
```

Expected output:
```json
{
  "DefineAuthChallenge": "arn:aws:lambda:ap-south-1:163985745933:function:vizzi-defineAuthChallenge",
  "CreateAuthChallenge": "arn:aws:lambda:ap-south-1:163985745933:function:vizzi-createAuthChallenge",
  "VerifyAuthChallengeResponse": "arn:aws:lambda:ap-south-1:163985745933:function:vizzi-verifyAuthChallenge"
}
```

### Check App Client Auth Flows
```bash
aws cognito-idp describe-user-pool-client \
  --user-pool-id ap-south-1_0byWYlztF \
  --client-id 6r4ihia5ehfefpgc8nfmi50cdv \
  --region ap-south-1 \
  --query 'UserPoolClient.ExplicitAuthFlows'
```

Expected output:
```json
[
  "ALLOW_CUSTOM_AUTH",
  "ALLOW_REFRESH_TOKEN_AUTH"
]
```

---

## ✅ After Completing Manual Steps

Run the development server and test:

```bash
npm run dev
```

Then visit: http://localhost:3000/login

### Test Flow:
1. Enter mobile number: `9876543210`
2. Click "Get OTP"
3. Check your mobile for OTP SMS
4. Enter the 4-digit OTP
5. Click "Verify & Continue"
6. You should be redirected to dashboard

---

## 🐛 Troubleshooting

### If OTP is not received:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/vizzi-createAuthChallenge --follow --region ap-south-1
```

### If OTP verification fails:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/vizzi-verifyAuthChallenge --follow --region ap-south-1
```

### If you see "Invalid authentication parameters":
- Verify CUSTOM_AUTH is enabled on app client
- Check Lambda triggers are attached to User Pool

---

## 📞 Need Help?

Check these files for detailed information:
- `DEPLOYMENT_STATUS.md` - Complete deployment status
- `LAMBDA_DEPLOYMENT_GUIDE.md` - Detailed Lambda guide
- `AWS_SETUP_ANALYSIS.md` - Full AWS configuration analysis

---

**Estimated Time: 5 minutes**
**Difficulty: Easy (just clicking buttons in AWS Console)**

Once done, your authentication system will be fully operational! 🚀
