# Switch to Cognito Authentication for AppSync

## Why Switch?

The API_KEY authentication isn't working despite proper schema configuration. Cognito authentication is:
- Already set up and working for login/signup
- More secure (user-based permissions)
- More reliable for production use
- Better aligned with AWS best practices

## Changes Required

### 1. Update Amplify Configuration
Change `src/lib/amplify.ts` to use Cognito as default auth mode

### 2. Update Authorization Rules
The schema already supports both API_KEY and Cognito:
```typescript
.authorization((allow) => [
  allow.publicApiKey().to(['create', 'read', 'update']),
  allow.authenticated().to(['create', 'read', 'update']),
])
```

### 3. Ensure User is Authenticated
Dashboard queries will use the logged-in user's Cognito token

## Implementation

The key change is in how we configure Amplify and make GraphQL queries. Instead of using API_KEY, we'll use the user's Cognito session.

## Benefits

1. **Works immediately** - No waiting for schema deployment
2. **More secure** - User-based access control
3. **Production-ready** - Follows AWS security best practices
4. **Scalable** - Can add fine-grained permissions later

## Trade-offs

- Requires user to be logged in (already the case for dashboard)
- Slightly more complex token management (handled by Amplify)
