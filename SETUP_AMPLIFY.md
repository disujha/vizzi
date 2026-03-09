# AWS Amplify Setup Required

## Issue
Authentication not working on deployed site: https://main.dqkr5hog6v2v4.amplifyapp.com/

**Errors**:
- Signup: "Could not load credentials from any providers"
- Login: "Invalid username, OTP, or secret hash"

## Solution
Add environment variables to AWS Amplify deployment.

---

## Steps to Fix

### 1. Open AWS Amplify Console
Go to: https://console.aws.amazon.com/amplify/

### 2. Select Your App
Click on your app (vizzi)

### 3. Add Environment Variables
- Click **App settings** → **Environment variables**
- Click **Manage variables**
- Add these 7 variables:

| Variable | Value |
|----------|-------|
| `AWS_REGION` | `ap-south-1` |
| `AWS_USER_POOL_ID` | `ap-south-1_0byWYlztF` |
| `AWS_USER_POOL_CLIENT_ID` | `1oqlon9kgthoerfqkm06iuonla` |
| `AWS_ACCESS_KEY_ID` | Get from `.env.local` file |
| `AWS_SECRET_ACCESS_KEY` | Get from `.env.local` file |
| `MSG91_AUTH_KEY` | `462703A7BdGmwT2m68b928c3P1` |
| `MSG91_TEMPLATE_OTP` | `69aa30f6f17f92c8ae010052` |

### 4. Save and Redeploy
- Click **Save**
- Go to **main** branch
- Click **Redeploy this version**
- Wait 3-5 minutes for build to complete

---

## Test After Deployment

### Signup
1. Go to https://main.dqkr5hog6v2v4.amplifyapp.com/
2. Click "Start Free Trial"
3. Enter clinic name and mobile number
4. Should receive OTP via SMS
5. Enter OTP to complete signup

### Login
1. Go to https://main.dqkr5hog6v2v4.amplifyapp.com/login
2. Enter mobile number
3. Should receive OTP via SMS
4. Enter OTP to login

---

## Documentation Files

Essential documentation kept:
- **README.md** - Project overview
- **REQUIREMENTS.md** - Product requirements (942 lines)
- **DESIGN.md** - Technical design (3,174 lines)
- **VIZZI_AI_CLINIC_RECEPTIONIST_EXECUTION.md** - AWS implementation showcase (650 lines)
- **AMPLIFY_AUTH_FIX.md** - Detailed authentication fix guide
- **SETUP_AMPLIFY.md** - This quick setup guide

All other temporary documentation files have been removed.

---

## Need Help?

See **AMPLIFY_AUTH_FIX.md** for detailed troubleshooting and step-by-step instructions.
