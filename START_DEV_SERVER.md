# How to Start the Development Server

## Issue
The error "Can't resolve 'tailwindcss' in 'D:\Apps'" suggests the dev server is being started from the wrong directory.

## Solution

Make sure you're in the correct directory before starting:

```bash
# 1. Navigate to the project directory
cd D:\Apps\vizzi_ai

# 2. Verify you're in the right place
pwd
# Should show: D:\Apps\vizzi_ai

# 3. Clean the build cache
rm -rf .next

# 4. Start the dev server
npm run dev
```

## Alternative: Use Full Path

If the issue persists, try:

```bash
cd D:\Apps\vizzi_ai && npm run dev
```

## Verify Installation

If you still see errors, reinstall dependencies:

```bash
cd D:\Apps\vizzi_ai
rm -rf node_modules
npm install
npm run dev
```

## Current Working Directory Check

Run this to verify:
```bash
Get-Location
```

Should output: `D:\Apps\vizzi_ai`

If it shows `D:\Apps`, then you need to:
```bash
cd vizzi_ai
```
