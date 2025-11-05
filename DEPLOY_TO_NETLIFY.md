# 🚀 Deploy SalesCalc to Netlify - Quick Guide

## Prerequisites
- GitHub account
- Netlify account (free tier works)
- Supabase project set up

## Step 1: Push to GitHub

```bash
# If not already initialized
git init
git add .
git commit -m "Ready for deployment - All fixes applied"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/SalesCalc.git
git branch -M main
git push -u origin main
```

## Step 2: Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and login
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** as your Git provider
4. Select the **SalesCalc** repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18` (set in netlify.toml)

## Step 3: Add Environment Variables

In Netlify dashboard:
1. Go to **Site settings** → **Environment variables**
2. Add these variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find these:**
- Login to [supabase.com](https://supabase.com)
- Open your project
- Go to **Settings** → **API**
- Copy **Project URL** and **anon public key**

## Step 4: Deploy!

1. Click **"Deploy site"**
2. Wait for build to complete (~2-3 minutes)
3. Your site will be live at `https://random-name-12345.netlify.app`

## Step 5: Test Your Deployment

Visit your Netlify URL and test:
- [ ] Login page loads
- [ ] Can login with existing user
- [ ] Dashboard displays correctly
- [ ] Can create a quotation
- [ ] All pages accessible

## Step 6: Custom Domain (Optional)

1. In Netlify: **Domain settings** → **Add custom domain**
2. Enter your domain (e.g., `quotes.yourcompany.com`)
3. Follow DNS configuration instructions
4. SSL certificate is automatically provisioned

## Troubleshooting

### Build Fails
- Check Node version is 18+
- Verify environment variables are set correctly
- Check build logs for specific errors

### Site Loads But Features Don't Work
- Verify Supabase environment variables are correct
- Check browser console for errors
- Ensure Supabase project is active
- Verify RLS policies are enabled

### Can't Login
- Check Supabase Auth is enabled
- Verify users exist in database
- Check browser console for auth errors

## Quick Commands

```bash
# Local development
npm install
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (optional)
npm run typecheck
```

## Support

For issues:
1. Check browser console for errors
2. Check Netlify build logs
3. Verify Supabase dashboard for database issues
4. Review FIXES_APPLIED.md for technical details

---

**Status:** ✅ Ready for deployment!
**Build Time:** ~5-6 seconds
**Bundle Size:** ~228 KB (gzipped)
