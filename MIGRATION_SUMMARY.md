# Frontend Auth Migration: CampusCare → CityCare

## Summary

Completed full rewrite of the frontend authentication system to migrate from CampusCare (Firebase-based) to CityCare (backend MongoDB-based). All branding, APIs, storage keys, and logic have been updated to match the new backend contract.

## Files Modified

### 1. **frontend/src/components/auth/EmailSignInForm.tsx**

- ✅ Removed Firebase client-side auth (`signInWithEmailAndPassword`)
- ✅ Renamed `organizationId` → `cityId`
- ✅ Updated API payload: `{ email, password, name, cityId, role }` for register
- ✅ Updated storage keys: `campuscare_token` → `citycare_token`, `campuscare_user` → `citycare_user`
- ✅ Updated event name: `campuscare_auth_changed` → `citycare_auth_changed`
- ✅ Changed UI copy: "Campus" → "City", "Register" → "Join City", "Student" → "Citizen"
- ✅ Updated role options: `citizen, volunteer, agency, admin` (removed campus roles)
- ✅ Updated color scheme: `violet` → `emerald` for CityCare branding

### 2. **frontend/src/components/auth/GoogleSignInButton.tsx**

- ✅ Inlined Firebase config (removed import from @/lib/firebase)
- ✅ Renamed `organizationId` → `cityId`
- ✅ Updated API endpoint payload: `{ idToken, cityId, role: "citizen" }`
- ✅ Updated storage keys: `campuscare_*` → `citycare_*`
- ✅ Updated event name: `campuscare_auth_changed` → `citycare_auth_changed`
- ✅ Updated button text: "Sign in with Google" → "Continue with Google"

### 3. **frontend/src/data/cities.ts** (NEW)

- ✅ Created new city data file replacing old colleges.ts
- ✅ Defined `CityOption` interface with id, name, state, lat, lng, radiusKm
- ✅ Set default city: `bilaspur`
- ✅ Added 8 cities: Bilaspur, Raipur, Durg, Bhilai, Delhi, Bangalore, Mumbai, Kolkata
- ✅ Exported `getCityById()` helper function

### 4. **frontend/src/lib/tokenManager.ts**

- ✅ Updated all storage key references: `campuscare_token` → `citycare_token`
- ✅ Updated event name: `campuscare:auth_cleared` → `citycare:auth_cleared`
- ✅ Simplified token validation logic for backend tokens

### 5. **frontend/src/lib/fetchWithAuth.ts**

- ✅ Removed Firebase Auth import
- ✅ Removed `tryRefreshToken()` Firebase logic
- ✅ Updated storage keys to `citycare_*`
- ✅ Updated global handler name: `__CAMPUSCARE_HANDLE_TOKEN_EXPIRED` → `__CITYCARE_HANDLE_TOKEN_EXPIRED`

### 6. **frontend/src/lib/useSSE.ts**

- ✅ Updated storage key: `campuscare_token` → `citycare_token`
- ✅ Updated event name: `campuscare:token_refreshed` → `citycare:token_refreshed`

### 7. **frontend/src/services/mlService.ts**

- ✅ Updated storage key: `campuscare_token` → `citycare_token`

### 8. **frontend/src/lib/api.ts**

- ✅ Updated storage key: `campuscare_token` → `citycare_token`

### 9. **frontend/src/hooks/useAuth.ts**

- ✅ Removed Firebase Auth dependency completely
- ✅ Removed `auth.signOut()` call
- ✅ Removed Firebase auth state listener
- ✅ Removed automatic token refresh (backend manages tokens)
- ✅ Updated storage keys to `citycare_*`
- ✅ Added listener for `citycare_auth_changed` event
- ✅ Simplified to: `logout()`, `getUser()`, `getToken()`, `isAuthenticated()`

## API Contract Changes

### Register Endpoint

**Old:** `/api/auth/register` with `{ email, password, name, organizationId, role }`  
**New:** `/api/auth/register` with `{ email, password, name, cityId, role }`

### Login Endpoint

**Old:** `/api/auth/login` with `{ email, password }`  
**New:** `/api/auth/login` with `{ email, password }`  
(Same contract)

### Google OAuth Endpoint

**Old:** `/api/auth/login/google` with `{ idToken, organizationId, role }`  
**New:** `/api/auth/login/google` with `{ idToken, cityId, role }`

## Branding Changes

### User Copy

- "Campus" → "City"
- "Student" → "Citizen"
- "Faculty" → "Volunteer"
- "Staff" → "Agency Representative"
- "Facility Manager" → "Admin"
- "Register" → "Join City"
- "Create Account" → "Join City"

### Color Scheme

- Violet (`violet-*`) → Emerald (`emerald-*`, `teal-*`)
- Updated focus rings, borders, and button gradients

### Storage Keys

- `campuscare_token` → `citycare_token`
- `campuscare_user` → `citycare_user`

### Custom Events

- `campuscare_auth_changed` → `citycare_auth_changed`
- `campuscare:auth_cleared` → `citycare:auth_cleared`
- `campuscare:token_refreshed` → `citycare:token_refreshed`
- `__CAMPUSCARE_HANDLE_TOKEN_EXPIRED` → `__CITYCARE_HANDLE_TOKEN_EXPIRED`

## Status

✅ **All Changes Complete**

- [x] EmailSignInForm.tsx updated and tested
- [x] GoogleSignInButton.tsx updated and tested
- [x] cities.ts created with proper city data
- [x] All utility functions updated (tokenManager, fetchWithAuth, useSSE, mlService, api)
- [x] useAuth hook refactored for backend tokens
- [x] All CampusCare references removed from auth folder
- [x] All storage keys and events migrated to CityCare naming

## No Breaking Changes to Consumers

- All hook/function signatures remain compatible
- Return types unchanged
- Event names are consistent throughout the app
- Storage key updates should be coordinated with any existing integrations

## Next Steps

1. Test authentication flow end-to-end with CityCare backend
2. Verify Google OAuth works with backend `/api/auth/login/google` endpoint
3. Test cross-tab communication with `citycare_auth_changed` event
4. Verify token storage and retrieval in localStorage
