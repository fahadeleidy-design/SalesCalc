# Multi-Tab Session Support

## Overview

The application now supports **multiple users logged in simultaneously on different tabs** of the same browser. This is achieved by using **sessionStorage** instead of **localStorage** for authentication sessions.

---

## How It Works

### Traditional Behavior (localStorage)
```
Browser localStorage (shared across all tabs)
├── Tab 1: User A logged in
├── Tab 2: User B tries to login → User A signed out from Tab 1
└── Tab 3: Any user logs out → All tabs signed out
```

### New Behavior (sessionStorage)
```
Browser with independent tab sessions
├── Tab 1: sessionStorage → User A logged in ✅
├── Tab 2: sessionStorage → User B logged in ✅
├── Tab 3: sessionStorage → User C logged in ✅
└── Tab 4: sessionStorage → User D logged in ✅

Each tab maintains its own session independently!
```

---

## Technical Implementation

### 1. Custom Storage Adapter
**File:** `src/lib/sessionStorage.ts`

```typescript
export class SupabaseSessionStorage implements SupportedStorage {
  getItem(key: string): string | null {
    return window.sessionStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    window.sessionStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    window.sessionStorage.removeItem(key);
  }
}
```

### 2. Supabase Client Configuration
**File:** `src/lib/supabase.ts`

```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,      // Use sessionStorage
    storageKey: 'supabase-session',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
```

---

## Usage Examples

### Scenario 1: Testing Multiple Roles
```
Tab 1: Login as sales@example.com (Sales Rep)
Tab 2: Login as manager@example.com (Manager)
Tab 3: Login as finance@example.com (Finance)
Tab 4: Login as ceo@example.com (CEO)

All 4 users are logged in simultaneously!
Each tab shows the correct user's dashboard.
```

### Scenario 2: Development & Testing
```
Tab 1: Test sales flow → Create quotation
Tab 2: Test manager flow → Approve quotation
Tab 3: Test finance flow → Approve pricing
Tab 4: Test customer view → Submit quotation

Switch between tabs to test complete workflow without logging in/out!
```

### Scenario 3: Demonstrations
```
Tab 1: Sales dashboard (show to sales team)
Tab 2: Manager dashboard (show to managers)
Tab 3: Finance dashboard (show to finance team)
Tab 4: CEO dashboard (show to executives)

Present different views without constant re-login!
```

---

## Important Notes

### ✅ Benefits
- **Faster Testing:** No need to logout/login between users
- **Workflow Testing:** Test complete approval chains in real-time
- **Demonstrations:** Show multiple user perspectives simultaneously
- **Development Speed:** Rapid context switching between roles

### ⚠️ Session Persistence
- **sessionStorage** = Session lasts only for the tab's lifetime
- **When tab closes** → Session is destroyed
- **When browser restarts** → All sessions cleared
- **Refresh page** → Session persists (stays logged in)

### 🔒 Security Considerations
- Each tab is **completely isolated**
- Closing one tab doesn't affect others
- No cross-tab data leakage
- Same security as single-tab authentication

---

## Comparison Table

| Feature | localStorage (Old) | sessionStorage (New) |
|---------|-------------------|---------------------|
| Multiple users per browser | ❌ No | ✅ Yes |
| Tabs share session | ✅ Yes | ❌ No |
| Sign out affects all tabs | ✅ Yes | ❌ No |
| Session survives browser restart | ✅ Yes | ❌ No |
| Session survives tab close | ✅ Yes | ❌ No |
| Session survives page refresh | ✅ Yes | ✅ Yes |
| Security level | ✅ High | ✅ High |
| Best for production | ✅ Yes | ⚠️ Depends* |
| Best for development/testing | ❌ No | ✅ Yes |

\* *For production, consider your use case: If users need persistent sessions across browser restarts, use localStorage. If tab isolation is more important, use sessionStorage.*

---

## Reverting to localStorage (if needed)

If you need to revert to traditional shared sessions:

1. **Edit `src/lib/supabase.ts`:**
```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Remove the storage property to use default localStorage
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

2. **Rebuild the application:**
```bash
npm run build
```

---

## Testing Multi-Tab Sessions

### Test Steps:

1. **Open the application**
2. **Tab 1:** Login as `sales@example.com`
3. **Open new tab (Tab 2):** Navigate to the same URL
4. **Tab 2:** Login as `manager@example.com`
5. **Switch to Tab 1:** Should still be logged in as sales@example.com ✅
6. **Switch to Tab 2:** Should be logged in as manager@example.com ✅
7. **Tab 2:** Click logout
8. **Tab 2:** Redirects to login ✅
9. **Switch to Tab 1:** Still logged in as sales@example.com ✅

### Expected Results:
- ✅ Both users stay logged in on their respective tabs
- ✅ Logging out in one tab doesn't affect the other
- ✅ Each tab maintains its own independent session
- ✅ Refreshing a tab keeps the user logged in
- ✅ Closing a tab destroys that tab's session only

---

## Browser DevTools Verification

### View sessionStorage:
```
1. Open Browser DevTools (F12)
2. Go to "Application" or "Storage" tab
3. Expand "Session Storage"
4. Click on your domain
5. Look for "supabase-session" key
6. Each tab has its own copy!
```

### Compare with localStorage:
```
1. Open DevTools → Application → Local Storage
2. Should be empty (or have non-auth data)
3. Auth data is now in sessionStorage instead!
```

---

## Troubleshooting

### Problem: Tabs still share sessions
**Solution:** Clear browser cache and rebuild:
```bash
# Clear browser's sessionStorage and localStorage
# Then rebuild
npm run build
```

### Problem: Session lost on refresh
**Check:** `persistSession: true` in supabase config
**Verify:** sessionStorage contains "supabase-session" key

### Problem: Need persistent sessions
**Solution:** Use localStorage instead (see reverting section above)

---

## Production Considerations

### When to Use sessionStorage (Multi-Tab):
- ✅ Development and testing environments
- ✅ Demo and presentation environments
- ✅ Applications where users need to switch roles frequently
- ✅ Call centers where multiple reps share a computer

### When to Use localStorage (Traditional):
- ✅ Production environments with single-user-per-browser
- ✅ Applications requiring persistent login across browser restarts
- ✅ Mobile/tablet applications
- ✅ Standard business applications

---

## Files Modified

1. ✅ `src/lib/sessionStorage.ts` (NEW) - Custom storage adapter
2. ✅ `src/lib/supabase.ts` - Updated to use sessionStorage
3. ✅ `src/contexts/AuthContext.tsx` - Removed cross-tab notifications
4. ✅ `src/pages/Login.tsx` - Updated banner to show multi-tab support

---

## Support

For questions or issues with multi-tab sessions:
1. Check browser console for errors
2. Verify sessionStorage in DevTools
3. Test with incognito window to rule out caching issues
4. Rebuild the application after any changes

---

**Multi-tab sessions are now fully functional! 🎉**
