# AWS Amplify GitHub Connection Setup

## Current Status
✅ Code pushed to GitHub: https://github.com/disujha/vizzi_ai
✅ amplify.yml configuration added
⚠️ AWS Amplify needs to be connected to GitHub repository

## Steps to Connect AWS Amplify to GitHub

### Option 1: Through AWS Amplify Console (Recommended)

1. **Go to AWS Amplify Console**
   - Open: https://console.aws.amazon.com/amplify/
   - Select your region (ap-south-1 - Mumbai)

2. **Check Existing App**
   - Look for an app with domain: `dqkr5hog6v2v4.amplifyapp.com`
   - If it exists, click on it

3. **Update Repository Connection**
   - Click on "App settings" → "General"
   - Under "Repository", check if it's connected to `disujha/vizzi_ai`
   - If not connected or pointing to wrong repo:
     - Click "Edit" or "Reconnect repository"
     - Select "GitHub"
     - Authorize AWS Amplify to access your GitHub account
     - Select repository: `disujha/vizzi_ai`
     - Select branch: `main`
     - Click "Save"

4. **Verify Build Settings**
   - Go to "App settings" → "Build settings"
   - Ensure it's using the `amplify.yml` file from the repository
   - Build command should be: `npm run build`
   - Output directory should be: `.next`

5. **Trigger Manual Build**
   - Go to the app dashboard
   - Click "Run build" or wait for automatic deployment
   - Monitor the build logs

### Option 2: Create New Amplify App (If needed)

If the existing app is not working or you want to start fresh:

1. **Create New App**
   - Go to AWS Amplify Console
   - Click "New app" → "Host web app"
   - Select "GitHub"
   - Authorize and select `disujha/vizzi_ai` repository
   - Select `main` branch

2. **Configure Build Settings**
   - Amplify will auto-detect Next.js
   - It will use the `amplify.yml` file we created
   - Click "Next"

3. **Review and Deploy**
   - Review settings
   - Click "Save and deploy"
   - Wait for deployment to complete

4. **Get New URL**
   - Once deployed, you'll get a new URL like: `https://main.xxxxx.amplifyapp.com`
   - Update your references to use this new URL

## Troubleshooting

### Build Fails
- Check build logs in Amplify console
- Ensure all environment variables are set (if needed)
- Verify `package.json` has correct build script

### Repository Not Syncing
- Check GitHub webhook settings in repository settings
- Verify AWS Amplify has access to the repository
- Try disconnecting and reconnecting the repository

### Old Deployment Still Showing
- Clear browser cache
- Wait 5-10 minutes for CDN to update
- Check if you're looking at the correct Amplify app

## Environment Variables (If Needed)

If your app requires environment variables, add them in:
- AWS Amplify Console → App settings → Environment variables

Common variables for this project:
```
NEXT_PUBLIC_AWS_REGION=ap-south-1
NEXT_PUBLIC_USER_POOL_ID=<your-user-pool-id>
NEXT_PUBLIC_USER_POOL_CLIENT_ID=<your-client-id>
```

## Verification

After setup, verify:
1. ✅ GitHub shows webhook from AWS Amplify
2. ✅ Amplify console shows successful build
3. ✅ Website loads at the Amplify URL
4. ✅ Changes pushed to GitHub trigger automatic builds

## Current Deployment URL
https://main.dqkr5hog6v2v4.amplifyapp.com/

If this URL is not working after following the steps above, you may need to create a new Amplify app and get a new URL.
