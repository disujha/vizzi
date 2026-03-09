# Cloud Sync Fix - Clinic Name Update Issue

## Problem
When updating the clinic name in Settings, users saw the warning:
```
Saved locally. Cloud sync is unavailable due to backend authorization.
```

## Root Cause
The issue had two parts:

1. **Missing Clinic Record**: When users signed up, only a Cognito user was created, but no corresponding clinic record was created in AppSync. The app uses localStorage as primary storage and syncs to AppSync as secondary. When the settings page tried to update the clinic in AppSync, it failed because the record didn't exist.

2. **Poor Error Handling**: The `setDoc` function in `src/lib/db.ts` was treating "record not found" errors the same as "authorization failed" errors, triggering the "local_only" sync mode warning.

## Solution

### 1. Improved Error Handling in `src/lib/db.ts`
Updated the `setDoc` function to distinguish between different error types:
- "Record not found" → Automatically creates the record
- "Authorization failed" → Shows the sync warning
- Other errors → Logs warning but continues

```typescript
// Now checks if error is "not found" vs "unauthorized"
const errorMessage = String(e?.message || "").toLowerCase();
const isNotFound = errorMessage.includes("not found") || errorMessage.includes("does not exist");

if (isNotFound) {
    // Try to create the record
    await gqlCall(Q.createClinic, { input: { id: ref.id, ...strip(mappedData, "clinic") } });
} else if (isUnauthorizedGraphQLError(e)) {
    // Real authorization error
    emitLocalOnlySync("clinics");
}
```

### 2. Auto-Initialize Clinic Record in `src/app/dashboard/settings/page.tsx`
Added logic to create a clinic record when the user first accesses the dashboard:

```typescript
} else {
    // Clinic record doesn't exist - initialize it
    const now = Date.now();
    const initialClinic = {
        id: user.userId,
        name: user.username || "My Clinic",
        clinicName: user.username || "My Clinic",
        signupDate: now,
        currentPlan: "FREE",
        patientsLimit: 300,
        smsLimit: 50,
        status: "OPEN",
    };
    void setDoc(clinicRef, initialClinic, { merge: false });
}
```

## Testing
1. New users: Clinic record is automatically created in both localStorage and AppSync on first dashboard access
2. Existing users: If clinic record is missing in AppSync, it will be created automatically
3. Clinic name updates: Now sync properly to AppSync without showing the warning
4. Authorization errors: Still properly detected and show the warning

## Files Modified
- `src/lib/db.ts` - Improved error handling in setDoc function
- `src/app/dashboard/settings/page.tsx` - Added clinic initialization logic

## Notes
- The app uses localStorage as primary storage with AppSync as secondary sync
- The AppSync schema already has correct authorization rules (API_KEY + authenticated)
- The issue was not with authorization, but with missing records in AppSync
- Cloud sync now works properly for clinic updates
