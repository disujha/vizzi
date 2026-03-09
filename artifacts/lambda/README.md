# Cognito Custom Auth Lambda Functions

This directory contains three Lambda functions required for implementing Cognito's Custom Authentication flow with MSG91 OTP verification.

## Files

1. **defineAuthChallenge.js** - Controls the authentication flow
2. **createAuthChallenge.js** - Generates and sends OTP via MSG91
3. **verifyAuthChallengeResponse.js** - Verifies the OTP entered by the user

## Deployment Instructions

### Step 1: Create Lambda Functions

1. Go to AWS Lambda Console
2. Create three new functions with Node.js 18.x or 20.x runtime:
   - `vizzi-defineAuthChallenge`
   - `vizzi-createAuthChallenge` 
   - `vizzi-verifyAuthChallengeResponse`

3. Copy the corresponding code from each file to your Lambda functions

### Step 2: Set Environment Variables

For the `createAuthChallenge` function, set these environment variables:

```
MSG91_AUTH_KEY=your_actual_msg91_auth_key
MSG91_TEMPLATE_ID=your_otp_template_id
MSG91_SENDER_ID=VIZZAI
```

### Step 3: Attach to Cognito User Pool

1. Go to AWS Cognito Console
2. Select your User Pool
3. Go to "User pool properties" -> "Lambda triggers"
4. Set the following triggers:
   - **Define auth challenge**: `vizzi-defineAuthChallenge`
   - **Create auth challenge**: `vizzi-createAuthChallenge`
   - **Verify auth challenge response**: `vizzi-verifyAuthChallengeResponse`

### Step 4: Test the Flow

1. Use the web application to test login with a mobile number
2. The Lambda functions will:
   - Generate a 4-digit OTP
   - Send it via MSG91 API
   - Verify the user's input
   - Issue JWT tokens upon success

## Important Notes

- **For Testing**: If MSG91 API fails, the OTP will still be generated and available in the response for testing purposes
- **Security**: In production, remove the testing fallback that exposes the OTP in the response
- **Mobile Format**: The Lambda expects mobile numbers in 10-digit format (without +91 prefix)
- **OTP Length**: Currently set to 4 digits, can be modified in the createAuthChallenge function

## Troubleshooting

1. Check CloudWatch logs for each Lambda function
2. Verify MSG91 credentials and template ID
3. Ensure Cognito User Pool has the correct Lambda triggers attached
4. Test with a real mobile number to verify SMS delivery
