# Netlify Deployment Troubleshooting Guide

## Current Issue: Blank Page with Module Loading Error

**Error Message:**
```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/html".
```

## Root Cause

Netlify is serving `index.html` for JavaScript asset requests instead of the actual JS files. This happens when the redirect rules catch asset files.

## Fixes Applied

### 1. Updated `public/_redirects`
```
# Serve static assets directly - DO NOT redirect
/assets/*  /assets/:splat  200
/*.js  /:splat  200
/*.css  /:splat  200
# ... other asset types

# SPA routing - serve index.html for all other routes
/*  /index.html  200
```

### 2. Updated `netlify.toml`
- Removed redirect rules (using `_redirects` file instead)
- Added explicit headers for JavaScript and CSS files
- Set proper Content-Type headers

## Manual Fix Options

If the automatic deployment still fails, try these manual steps:

### Option 1: Clear Netlify Build Cache

1. Go to Netlify Dashboard: https://app.netlify.com/sites/salesquotationcalc
2. Click **Deploys** tab
3. Click **Deploy settings**
4. Scroll to **Build & deploy**
5. Click **Clear cache and retry deploy**

### Option 2: Manual Deploy

1. Build locally:
   ```bash
   cd /path/to/SalesCalc
   npm run build
   ```

2. Deploy via Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy --prod --dir=dist
   ```

### Option 3: Check Netlify Deploy Log

1. Go to Netlify Dashboard
2. Click on the latest deploy
3. Check the deploy log for errors
4. Look for:
   - Build command success
   - Files published to `dist/`
   - Asset file paths

## Verification Steps

After deployment completes:

### 1. Check Asset URLs Directly

Visit these URLs in your browser:
- https://salesquotationcalc.netlify.app/assets/index-Df10FWmI.js
- Should return JavaScript code, NOT HTML

### 2. Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests (red)
5. Click on a failed JS file
6. Check the Response tab
   - Should be JavaScript code
   - NOT HTML content

### 3. Check Response Headers

In Network tab, click on a JS file and check Headers:
- **Content-Type** should be `application/javascript`
- **Status** should be `200`

## Alternative Solution: Use Netlify Functions

If the issue persists, we can deploy as a Netlify Function instead:

1. Create `netlify/functions/server.js`
2. Serve the app through a function
3. This bypasses the static hosting redirect issues

## Contact Netlify Support

If none of the above works, contact Netlify support:
- Email: support@netlify.com
- Include:
  - Site name: salesquotationcalc
  - Deploy ID from the Deploys tab
  - Error message
  - This troubleshooting guide

## Expected Timeline

- **Build time:** 1-2 minutes
- **Deploy time:** 30 seconds
- **CDN propagation:** 1-2 minutes
- **Total:** ~3-5 minutes from push to live

## Success Criteria

✅ Page loads with login form visible  
✅ No console errors  
✅ JavaScript files load with status 200  
✅ Content-Type headers are correct  
✅ Can log in and navigate the app

---

**Last Updated:** November 6, 2025  
**Status:** Troubleshooting in progress
