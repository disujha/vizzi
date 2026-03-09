# Dashboard Data Sync Analysis

## Current Status: HYBRID (localStorage + Backend Sync)

Your dashboard uses a **dual-storage architecture** with localStorage as a fallback when backend sync fails.

---

## Data Flow Architecture

### 1. Signup Flow (src/app/login/page.tsx)

**Step 1: Create Cognito User**
```
POST /api/auth/signup
- Username: +918585810708
- Phone: +918585810810708
```

**Step 2: Create Clinic Record in AppSync**
```graphql
mutation CreateClinic {
  id: "clinic-8585810708"  # Format: clinic-{10-digit-mobile}
  clinicName: "Your Clinic Name"
  phone: "+918585810708"
  smsClinicName: "YOURCLINIC1"
}
```

**Step 3: Store Session in localStorage**
```javascript
setLocalSession({
  userId: "clinic-8585810708",
  username: "Your Clinic Name",
  mobile: "+918585810708"
})
```

---

### 2. Dashboard Data Fetching (src/app/dashboard/page.tsx)

**Clinic Resolution Strategy** (tries in order):

1. **Direct userId lookup**: `getClinic(id: "clinic-8585810708")`
2. **Mobile number** (strip prefix): `getClinic(id: "8585810708")`
3. **Email as ID**: `getClinic(id: "8585810708@mobile.vizzi.local")`
4. **List by email filter**: `listClinics(filter: { email: { eq: "..." } })`
5. **List by phone filter**: `listClinics(filter: { phone: { eq: "8585810708" } })`
6. **DB wrapper lookup**: Direct Firestore/Firebase query

**Fallback Behavior**:
```javascript
if (!clinicFound) {
  // Use localStorage data
  const fallbackClinicName = user?.username?.trim() || "Your Clinic";
  const localStatus = getClinicStatusOverride(user.userId) || "OPEN";
  setClinicData({
    clinicName: fallbackClinicName,
    status: localStatus
  });
}
```

---

### 3. Real-Time Sync Architecture

#### AppSync (GraphQL) - Clinic Data
- **Source**: `src/lib/db.ts` wrapper
- **Collections**: `clinics/{id}`
- **Operations**: getClinic, updateClinic, createClinic
- **Subscriptions**: `onUpdateClinic` (if not API_KEY auth)

#### Firebase/Firestore - Queue & Doctors
- **Source**: Direct Firebase SDK via `src/lib/db.ts`
- **Collections**: 
  - `clinics/{clinicId}/queue` → QueuePatient
  - `clinics/{clinicId}/doctors` → Doctor
- **Real-time**: `onSnapshot` listeners for live updates

---

## Key Issues Identified

### Issue 1: Clinic ID Format Mismatch
**Problem**: Dashboard lookup might fail due to ID format inconsistency

**Signup creates**:
```
id: "clinic-8585810708"
```

**Dashboard tries**:
```
1. "clinic-8585810708" ✓ (should work)
2. "8585810708" ✗ (missing prefix)
3. "+918585810708" ✗ (wrong format)
```

**Solution**: Ensure consistent use of `clinic-{mobile}` format everywhere

---

### Issue 2: localStorage Masking Backend Failures
**Problem**: Dashboard shows data from localStorage even when backend sync fails

**Current Behavior**:
- User sees clinic name, status, etc. from localStorage
- Backend fetch silently fails
- No indication that data isn't syncing

**Recommendation**: Add sync status indicator to dashboard

---

### Issue 3: Status Overrides in localStorage
**Problem**: Clinic/doctor status stored in localStorage, not synced to backend

**Current Implementation**:
```javascript
// Clinic status override
setClinicStatusOverride(clinicId, "CLOSED");
// Stored in: localStorage["vizzi_clinic_status_{clinicId}"]

// Doctor status override
setDoctorStatusOverride(clinicId, doctorId, "ON_BREAK");
// Stored in: localStorage["vizzi_doctor_status_{clinicId}_{doctorId}"]
```

**Impact**:
- Status changes only visible on current device
- Kiosk and dashboard can show different statuses
- No backend persistence

---

## Verification Steps

### Step 1: Check if Clinic Record Exists in AppSync

Run this query in AWS AppSync console:
```graphql
query GetClinic {
  getClinic(id: "clinic-8585810708") {
    id
    clinicName
    phone
    smsClinicName
    status
  }
}
```

### Step 2: Check localStorage Data

Open browser console on dashboard:
```javascript
// Check session
localStorage.getItem('vizzi_auth_session')

// Check clinic status override
localStorage.getItem('vizzi_clinic_status_clinic-8585810708')

// Check all vizzi keys
Object.keys(localStorage).filter(k => k.startsWith('vizzi_'))
```

### Step 3: Monitor Network Requests

1. Open DevTools → Network tab
2. Filter: `graphql`
3. Look for:
   - `getClinic` query
   - `listClinics` query
   - Any 401/403 errors

---

## Recommendations

### Option 1: Keep Hybrid (Current Approach)
**Pros**:
- Works offline
- Fast initial load
- Graceful degradation

**Cons**:
- Data inconsistency between devices
- Hard to debug sync issues
- Status changes not persisted

**Action Items**:
1. Fix clinic ID lookup to use consistent format
2. Add sync status indicator to UI
3. Persist status changes to backend

### Option 2: Backend-Only (Remove localStorage Fallback)
**Pros**:
- Single source of truth
- Consistent across devices
- Easier to debug

**Cons**:
- Requires network connection
- Slower initial load
- No offline support

**Action Items**:
1. Remove localStorage fallback
2. Add loading states
3. Handle network errors gracefully

### Option 3: Backend Primary + localStorage Cache
**Pros**:
- Best of both worlds
- Fast + consistent
- Offline support

**Cons**:
- More complex implementation
- Need cache invalidation strategy

**Action Items**:
1. Fetch from backend first
2. Cache in localStorage
3. Add cache expiry/invalidation
4. Sync status changes to backend

---

## Recommended Fix (Quick Win)

### Fix Clinic Lookup Issue

**File**: `src/app/dashboard/page.tsx`

**Current Problem**: Dashboard tries multiple ID formats but might not match signup format

**Solution**: Ensure consistent clinic ID format

```typescript
// In resolveClinic function, line ~120
const clinicId = user.userId; // Should be "clinic-8585810708"

// Try direct lookup first
const c1 = await tryGetClinic(clinicId);
if (c1) return c1;

// If userId doesn't have "clinic-" prefix, add it
if (!clinicId.startsWith("clinic-")) {
  const c2 = await tryGetClinic(`clinic-${clinicId}`);
  if (c2) return c2;
}
```

### Add Sync Status Indicator

**File**: `src/app/dashboard/page.tsx`

Add state to track sync status:
```typescript
const [syncStatus, setSyncStatus] = useState<'synced' | 'local' | 'syncing'>('syncing');

// In resolveClinic:
if (clinicFromBackend) {
  setSyncStatus('synced');
} else {
  setSyncStatus('local');
}
```

Display in UI:
```tsx
<div className="flex items-center gap-2">
  {syncStatus === 'synced' && <span className="text-green-600">✓ Synced</span>}
  {syncStatus === 'local' && <span className="text-amber-600">⚠ Local Only</span>}
</div>
```

---

## Next Steps

1. **Verify clinic record exists** in AppSync for your test user
2. **Check browser console** for any GraphQL errors
3. **Test clinic lookup** with correct ID format
4. **Decide on sync strategy** (hybrid vs backend-only)
5. **Implement status persistence** to backend if needed

---

## Files Involved

- `src/app/dashboard/page.tsx` - Main dashboard with data fetching
- `src/app/login/page.tsx` - Signup flow that creates clinic
- `src/lib/authSession.ts` - localStorage session management
- `src/lib/clinicQueue.ts` - Status override functions
- `src/lib/db.ts` - Database wrapper (AppSync + Firebase)
- `amplify/data/resource.ts` - AppSync schema
