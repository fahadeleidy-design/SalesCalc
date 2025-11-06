# SalesCalc v2.0 - Deployment Guide

**Date:** November 6, 2025  
**Version:** 2.0 (Major Upgrade)  
**Status:** Ready for Production

## Pre-Deployment Checklist

### Build Status
- Production build successful
- No TypeScript errors
- All dependencies installed
- Service Worker updated to v3

### Required Environment Variables
```
VITE_SUPABASE_URL=https://eugjmayuqlvddefnkysp.supabase.co
VITE_SUPABASE_ANON_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

## Deployment via Git Push

1. Commit changes:
   ```bash
   git add .
   git commit -m "feat: v2.0 major upgrade"
   git push origin main
   ```

2. Netlify auto-deploys to: https://salesquotationcalc.netlify.app/

## New Features Deployed

1. TanStack Query for optimized data fetching
2. Real-time collaboration with Supabase Realtime
3. AI-powered approval routing and suggestions
4. Advanced analytics dashboard
5. Enhanced PWA capabilities
6. PDF and Excel export functionality
7. Notification system
8. Presence indicators

## Post-Deployment Verification

- Test login with all user roles
- Verify real-time updates work
- Check AI suggestions appear
- Test export functionality
- Verify PWA install prompt
- Check analytics dashboard

## Rollback Plan

If issues occur:
1. Go to Netlify dashboard
2. Find previous deployment
3. Click "Publish deploy"

---
**Prepared by:** Manus AI  
**Date:** November 6, 2025
