# Authentication Flow Test Guide

## 🧪 Test Scenarios

### **Test 1: New User Signup**
```bash
# Step 1: Test new mobile number
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initiateAuth",
    "mobile": "9999999999"
  }'

# Expected: User not found, should return userExists: false
# Check response for: userExists: false
```

### **Test 2: Existing User Login**
```bash
# Step 2: Test existing mobile number
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "initiateAuth",
    "mobile": "8585810708"
  }'

# Expected: User exists, should send OTP
# Check response for: userExists: true
```

### **Test 3: OTP Verification**
```bash
# Step 3: Verify OTP (use session from previous test)
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "action": "verifyOtp",
    "mobile": "8585810708",
    "otp": "1234",
    "session": "session_from_test_2"
  }'

# Expected: Should verify and return tokens
```

## 🔍 Debugging Steps

### **1. Check Lambda Functions**
```bash
# Verify Lambda functions are deployed
aws lambda list-functions --query 'Functions[?contains(FunctionName, `vizzi-`)]'

# Check CloudWatch logs
aws logs tail /aws/lambda/vizzi-createAuthChallenge --follow
aws logs tail /aws/lambda/vizzi-verifyAuthChallengeResponse --follow
```

### **2. Check API Response Structure**
```javascript
// Add this to login page temporarily to debug
console.log("API Response:", result);
console.log("User exists flag:", result.userExists);
console.log("Session:", result.session);
```

### **3. Check Frontend Logic**
```javascript
// In login page, add debugging:
const handleAuth = async (e) => {
    // ... existing code ...
    const result = await response.json();
    
    // Add these logs:
    console.log("Full API Response:", result);
    console.log("User exists from API:", result.userExists);
    console.log("Session from API:", result.session);
    
    // Check if this matches expected behavior
    if (result.userExists === false && !isSignUp) {
        console.log("Should switch to signup mode");
        // Should call setIsSignUp(true)
    }
};
```

## 🎯 Expected Behavior

### **New User (9999999999):**
1. `initiateAuth` → Lambda returns `userExists: false`
2. Frontend should switch to signup mode automatically
3. User completes signup → Gets OTP → Verifies → Login

### **Existing User (8585810708):**
1. `initiateAuth` → Lambda returns `userExists: true`
2. Frontend should stay in login mode
3. User gets OTP → Verifies → Login successful

## 🐛 Common Issues

### **Issue: API Response Missing userExists**
If the API is not returning `userExists` field, check:
- Lambda functions deployed correctly?
- API route extracting `userExists` from response?
- TypeScript interfaces up to date?

### **Issue: Frontend Not Checking userExists**
If the frontend is not checking `result.userExists`, check:
- Login page logic updated?
- Proper response handling?
- Console logs showing correct values?

## 📋 Quick Fix Checklist

- [ ] Deploy updated Lambda functions
- [ ] Test API responses with curl
- [ ] Add debug logging to frontend
- [ ] Verify userExists flag propagation
- [ ] Test complete signup flow
- [ ] Test complete login flow
