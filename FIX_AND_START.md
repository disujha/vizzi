# Fix Tailwind Error and Start Server

## The Problem
The error "Can't resolve 'tailwindcss' in 'D:\Apps'" happens because there are too many Node processes running or the dev server is confused about the working directory.

## Solution - Follow These Steps

### Step 1: Stop All Node Processes
Open a new PowerShell terminal and run:
```powershell
# Kill all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Clean Build Cache
```powershell
cd D:\Apps\vizzi_ai
Remove-Item -Recurse -Force .next
```

### Step 3: Verify You're in the Right Directory
```powershell
Get-Location
# Should show: D:\Apps\vizzi_ai
```

### Step 4: Start Dev Server
```powershell
npm run dev
```

## If Still Not Working

Try a complete clean install:

```powershell
# 1. Stop all node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Navigate to project
cd D:\Apps\vizzi_ai

# 3. Clean everything
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# 4. Reinstall
npm install

# 5. Start server
npm run dev
```

## Expected Output

When it works, you should see:
```
▲ Next.js 16.1.6
- Local:        http://localhost:3000
- Environments: .env.local

✓ Starting...
✓ Ready in 2.3s
```

## Then Test Login

1. Open browser: http://localhost:3000
2. Click "Start Free Trial" in navbar
3. Should navigate to: http://localhost:3000/login?mode=signup
4. Enter clinic details and mobile number
5. Click "Get OTP"
6. Check your mobile for SMS
7. Enter OTP and verify

## Troubleshooting

### If login page doesn't load:
- Check browser console (F12) for errors
- Make sure dev server is running
- Try accessing directly: http://localhost:3000/login

### If OTP doesn't arrive:
- Check Lambda logs:
```powershell
aws logs tail /aws/lambda/vizzi-createAuthChallenge --follow --region ap-south-1
```

### If you see "User not found":
- This is expected for first-time users
- The system should still send OTP
- Check Lambda logs for details
