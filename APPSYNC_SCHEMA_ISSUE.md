# AppSync Schema Not Deployed - Root Cause Found

## The Real Problem

Both authentication methods are failing:
1. **API_KEY**: "Not Authorized to access getClinic"
2. **Cognito**: "No federated jwt" (user not authenticated via Amplify Auth)

This means: **The AppSync API schema was never properly deployed**

## Why This Happens

When you run `npx ampx sandbox`, it should:
1. Create/update the AppSync API
2. Deploy the schema with authorization rules
3. Generate `amplify_outputs.json`

But sometimes the schema deployment fails silently, leaving you with:
- ✅ AppSync API created
- ✅ API_KEY generated
- ❌ Schema NOT deployed (no Clinic, Doctor, QueuePatient types)
- ❌ Authorization rules NOT applied

## Verify the Issue

### Check AWS Console:
1. Go to AWS Console → AppSync
2. Find API: `wbcw3zak3nfo5lhxpv2jxjqzye`
3. Click "Schema" tab
4. **Look for**: Clinic, Doctor, QueuePatient types

**If you DON'T see these types** → Schema was never deployed
**If you DO see these types** → Check authorization directives

## Solution Options

### Option 1: Manual Schema Deployment (RECOMMENDED)

Since sandbox deployment isn't working, manually deploy the schema:

1. **Go to AWS Console → AppSync → APIs**
2. **Find your API**: `wbcw3zak3nfo5lhxpv2jxjqzye`
3. **Click "Schema" tab**
4. **Click "Edit Schema"**
5. **Paste this schema**:

```graphql
type Clinic @model @auth(rules: [
  { allow: public, provider: apiKey, operations: [create, read, update] },
  { allow: private, operations: [create, read, update] }
]) {
  id: ID!
  name: String
  clinicName: String
  doctorName: String
  clinicType: String
  email: String
  phone: String
  status: ClinicStatus
  clinicLogoUri: String
  logoUrl: String
  doctorPhotoUri: String
  voiceVolume: Int
  smsClinicName: String
  smsEnabled: Boolean
  smsUsed: Int
  smsLimit: Int
  whatsappUsed: Int
  whatsappLimit: Int
  patientsUsed: Int
  patientsLimit: Int
  currentPlan: String
  planExpiryDate: AWSDateTime
  signupDate: AWSDateTime
  demoStartedAt: AWSDateTime
  tokenPrefix: String
  tokenDigits: Int
  startTime: String
  endTime: String
  breakStartTime: String
  breakEndTime: String
  voiceEnabled: Boolean
  voiceLanguage: String
  voiceRate: Float
  voicePitch: Float
  voiceGender: String
  voiceName: String
  announcementTemplate: String
  checkInAnnouncementTemplate: String
  checkInEnabled: Boolean
}

type Doctor @model @auth(rules: [
  { allow: public, provider: apiKey, operations: [create, read, update, delete] },
  { allow: private, operations: [create, read, update, delete] }
]) {
  id: ID!
  clinicId: String!
  name: String!
  prefix: String!
  active: Boolean
  status: DoctorStatus
  photoUrl: String
  activePatientId: String
  queuePosition: Int
}

type QueuePatient @model @auth(rules: [
  { allow: public, provider: apiKey, operations: [create, read, update, delete] },
  { allow: private, operations: [create, read, update, delete] }
]) {
  id: ID!
  clinicId: String!
  name: String
  mobileNumber: String
  tokenNumber: String
  status: String
  timestamp: Int
  doctorId: String
  doctorName: String
  doctorPrefix: String
  isAppointment: Boolean
  isEmergency: Boolean
  appointmentDate: String
  appointmentTime: String
  lastCalledAt: Int
  cancelledAt: Int
}

enum ClinicStatus {
  OPEN
  EMERGENCY_ONLY
  CLOSED
}

enum DoctorStatus {
  AVAILABLE
  ON_BREAK
  BUSY
  OFFLINE
}
```

6. **Click "Save Schema"**
7. **Wait for deployment** (may take 1-2 minutes)

### Option 2: Force Clean Sandbox Redeploy

```bash
# Stop any running processes
# Delete Amplify cache
rm -rf .amplify
rm -rf node_modules/.amplify

# Clean install
npm install

# Deploy sandbox with verbose logging
npx ampx sandbox --once
```

Watch for errors during schema deployment.

### Option 3: Use Firebase Instead (EASIEST)

Since Firebase is already working and the dashboard has fallback logic:

1. **Remove AppSync dependency** - Keep using localStorage + Firebase
2. **Focus on Firebase backend** - It's already working well
3. **Skip AWS AppSync** - Not worth the deployment hassles

The dashboard already works perfectly with Firebase, so this might be the pragmatic choice.

## Why Cognito Auth Failed

The "No federated jwt" error happens because:
1. Your auth flow uses custom Cognito triggers (Lambda functions)
2. Users aren't authenticated through Amplify's `Auth.signIn()`
3. No Cognito token is stored in Amplify's session
4. AppSync expects a Cognito JWT token that doesn't exist

To use Cognito auth with AppSync, you'd need to:
- Refactor the entire auth flow to use Amplify Auth
- Store Cognito tokens properly
- This is a major change and not worth it

## Recommendation

**Use Firebase + localStorage (current setup)**

Reasons:
1. ✅ Already working perfectly
2. ✅ No deployment issues
3. ✅ Simpler architecture
4. ✅ Dashboard has graceful fallback
5. ✅ All features work

AppSync adds complexity without clear benefits for your use case.

## If You Still Want AppSync

1. **Manually deploy schema** (Option 1 above)
2. **Test with API_KEY** (should work after schema deployment)
3. **Re-signup** to create clinic data
4. **Verify sync** on dashboard

But honestly, Firebase is working great - why fix what isn't broken?
