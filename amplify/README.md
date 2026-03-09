# Amplify Backend Notes

This repo includes an Amplify Gen 2 TypeScript scaffold:
- `amplify/backend.ts`
- `amplify/auth/resource.ts`
- `amplify/data/resource.ts`

## Deploy flow

1. Install backend package locally:
   `npm install -D @aws-amplify/backend`
2. Connect/sign in Amplify backend tooling if needed.
3. Start sandbox:
   `npx ampx sandbox`
4. Commit and push to trigger Amplify CI/CD.

## Important

Current app uses OTP local session (`clinic-xxxx`). AppSync `authenticated/userPool` requires valid Cognito JWT.
If you keep OTP local sessions, you must add a compatible auth mode (for example IAM, API key with strict resolver checks, or custom auth).
