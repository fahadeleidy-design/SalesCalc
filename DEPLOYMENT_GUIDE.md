# 🚀 Production Deployment Guide

Complete guide to deploy your Special Offices Quotation Management System to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Option 1: Deploy to Netlify (Recommended)](#option-1-deploy-to-netlify-recommended)
3. [Option 2: Deploy to Vercel](#option-2-deploy-to-vercel)
4. [Option 3: Deploy to AWS Amplify](#option-3-deploy-to-aws-amplify)
5. [Supabase Production Setup](#supabase-production-setup)
6. [Environment Variables](#environment-variables)
7. [Post-Deployment Steps](#post-deployment-steps)
8. [Custom Domain Setup](#custom-domain-setup)
9. [Security & Performance](#security--performance)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## 📝 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All features tested locally
- [ ] Database migrations applied
- [ ] Environment variables documented
- [ ] Build runs successfully (`npm run build`)
- [ ] No console errors in browser
- [ ] All Edge Functions deployed
- [ ] Demo users created (optional)
- [ ] Git repository ready (GitHub, GitLab, or Bitbucket)

---

## 🎯 Option 1: Deploy to Netlify (Recommended)

Netlify is the easiest and most reliable option for React/Vite applications.

### Step 1: Prepare Your Repository

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for production deployment"

# Create a repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Netlify

#### Option A: Via Netlify UI (Easiest)

1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** `18` or higher

6. Add environment variables (see [Environment Variables](#environment-variables))
7. Click **"Deploy site"**

#### Option B: Via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize Netlify in your project
netlify init

# Deploy
netlify deploy --prod
```

### Step 3: Configure Netlify Settings

Create a `netlify.toml` file in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

Commit and push this file to trigger a new deployment.

---

## 🚀 Option 2: Deploy to Vercel

Vercel is optimized for React applications and provides excellent performance.

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Step 3: Configure via UI

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add environment variables
5. Deploy

### Configuration File

Create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## ☁️ Option 3: Deploy to AWS Amplify

AWS Amplify provides powerful hosting with CDN.

### Step 1: Connect Repository

1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** → **"Host web app"**
3. Connect your Git provider
4. Select your repository and branch

### Step 2: Configure Build Settings

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Step 3: Add Environment Variables

Add your environment variables in the Amplify Console under:
**App settings** → **Environment variables**

---

## 🗄️ Supabase Production Setup

Your Supabase project is already configured, but ensure production readiness:

### Step 1: Review Database Security

```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should return 'true' for rowsecurity
```

### Step 2: Review Edge Functions

```bash
# List all edge functions
# They should already be deployed from development
```

Your edge functions are already deployed:
- ✅ `send-notification-email`

### Step 3: API Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy these values:
   - **Project URL**
   - **anon (public) key**

⚠️ **NEVER expose your service_role key publicly!**

### Step 4: Configure Email Settings (Optional)

For production email notifications:

1. Go to **Authentication** → **Email Templates**
2. Customize email templates
3. Configure SMTP settings (or use Supabase defaults)

### Step 5: Database Backups

1. Go to **Settings** → **Database**
2. Enable **Point-in-time Recovery** (PITR) for production
3. Set up automated backups

---

## 🔐 Environment Variables

Your application needs these environment variables in production:

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to Get These Values

1. Login to [supabase.com](https://supabase.com)
2. Open your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Setting Environment Variables

#### On Netlify:
1. Site settings → Build & deploy → Environment
2. Add variables
3. Redeploy

#### On Vercel:
1. Project Settings → Environment Variables
2. Add variables
3. Redeploy

#### On AWS Amplify:
1. App settings → Environment variables
2. Add variables
3. Redeploy

---

## ✅ Post-Deployment Steps

### 1. Test the Production App

- [ ] Visit your production URL
- [ ] Test user login
- [ ] Create a test quotation
- [ ] Test approval workflow
- [ ] Verify email notifications work
- [ ] Test file attachments
- [ ] Test product import/export
- [ ] Test user creation (as admin)
- [ ] Check all pages load correctly
- [ ] Test on mobile devices

### 2. Create Initial Admin User

If you don't have an admin user yet:

```sql
-- Run this in Supabase SQL Editor
-- Replace with your actual email
INSERT INTO profiles (id, email, full_name, role, created_at)
VALUES (
  gen_random_uuid(),
  'admin@yourcompany.com',
  'System Administrator',
  'admin',
  now()
);
```

Then login with this email (password will be set on first login).

### 3. Create Demo Users (Optional)

```sql
-- Sales representative
INSERT INTO profiles (id, email, full_name, role)
VALUES (gen_random_uuid(), 'sales@demo.com', 'Sales Rep', 'sales');

-- Manager
INSERT INTO profiles (id, email, full_name, role)
VALUES (gen_random_uuid(), 'manager@demo.com', 'Sales Manager', 'manager');

-- Engineering
INSERT INTO profiles (id, email, full_name, role)
VALUES (gen_random_uuid(), 'engineer@demo.com', 'Engineer', 'engineering');
```

### 4. Import Initial Products

1. Prepare a CSV file with your products
2. Login as admin
3. Go to Products page
4. Click "Import CSV"
5. Upload your file

Example CSV:
```csv
SKU,Name,Description,Category,Unit,Unit Price,Active
DESK001,"Executive Desk","Mahogany executive desk","Furniture",unit,1299.99,Yes
CHAIR001,"Office Chair","Ergonomic office chair","Furniture",unit,499.99,Yes
MON001,"Monitor 27in","4K display monitor","Electronics",unit,399.99,Yes
```

### 5. Configure Discount Matrix

1. Login as admin
2. Go to Settings
3. Configure discount tiers based on your business rules

---

## 🌐 Custom Domain Setup

### On Netlify

1. Go to **Domain settings**
2. Click **"Add custom domain"**
3. Enter your domain (e.g., `quotes.yourcompany.com`)
4. Follow DNS configuration instructions
5. Netlify provides free SSL certificate automatically

DNS Configuration:
```
Type: CNAME
Name: quotes (or www)
Value: your-site-name.netlify.app
```

### On Vercel

1. Go to **Settings** → **Domains**
2. Add your domain
3. Configure DNS:

```
Type: CNAME
Name: quotes
Value: cname.vercel-dns.com
```

### On AWS Amplify

1. Go to **Domain management**
2. Add domain
3. Follow DNS setup instructions
4. SSL certificate is automatically provisioned

---

## 🔒 Security & Performance

### Security Checklist

- [x] RLS (Row Level Security) enabled on all tables
- [x] API keys properly configured (anon key only)
- [x] Service role key NOT exposed in frontend
- [x] HTTPS enabled (automatic with hosting providers)
- [ ] Content Security Policy configured
- [ ] Rate limiting on Edge Functions (via Supabase)

### Performance Optimization

#### 1. Enable Caching

Add to your hosting configuration:

**Netlify** (`netlify.toml`):
```toml
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**Vercel** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

#### 2. Database Performance

```sql
-- Add indexes for commonly queried fields (if not already added)
CREATE INDEX IF NOT EXISTS idx_quotations_sales_rep ON quotations(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_created ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', company_name || ' ' || contact_name));
```

#### 3. Monitor Bundle Size

```bash
# Analyze bundle size
npm run build

# Check the output - should be under 500KB for JS
```

Current bundle:
- CSS: ~25 KB (gzipped: 5 KB)
- JS: ~448 KB (gzipped: 112 KB)

---

## 📊 Monitoring & Maintenance

### 1. Set Up Error Tracking

Install Sentry (optional but recommended):

```bash
npm install @sentry/react
```

Configure in `src/main.tsx`:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

### 2. Monitor Supabase Usage

1. Go to Supabase Dashboard
2. Check **Database** → **Usage**
3. Monitor:
   - Database size
   - API requests
   - Bandwidth
   - Edge Function invocations

### 3. Set Up Uptime Monitoring

Use services like:
- **UptimeRobot** (free)
- **Pingdom**
- **StatusCake**

Monitor your production URL: `https://your-app.netlify.app`

### 4. Regular Backups

Supabase provides automated backups, but you can also:

```bash
# Export database to SQL file (via Supabase dashboard)
# Settings → Database → Database backups
```

### 5. Update Dependencies

```bash
# Check for updates
npm outdated

# Update packages (carefully)
npm update

# Test thoroughly before deploying
npm run build
npm run dev
```

---

## 🚨 Troubleshooting

### Issue: Blank Page After Deployment

**Solution:**
1. Check browser console for errors
2. Verify environment variables are set correctly
3. Check build logs for errors
4. Ensure Supabase URL and keys are correct

### Issue: "Failed to fetch" errors

**Solution:**
1. Verify Supabase project URL
2. Check if Supabase project is paused (free tier)
3. Verify API keys are correct
4. Check CORS settings in Supabase

### Issue: Authentication not working

**Solution:**
1. Go to Supabase → Authentication → URL Configuration
2. Add your production URL to **Site URL**
3. Add redirect URLs under **Redirect URLs**

Example:
```
Site URL: https://your-app.netlify.app
Redirect URLs: https://your-app.netlify.app/**
```

### Issue: Edge Functions not working

**Solution:**
1. Verify Edge Function is deployed
2. Check Edge Function logs in Supabase dashboard
3. Ensure correct URL format in code
4. Check CORS headers in Edge Function

---

## 📱 Progressive Web App (Optional)

To make your app installable on mobile devices:

### 1. Add manifest.json

Create `public/manifest.json`:

```json
{
  "name": "Special Offices Quotation System",
  "short_name": "Quotations",
  "description": "Professional quotation management system",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 2. Add to index.html

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3b82f6">
```

### 3. Create Icons

Create icons in the `public` folder:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

---

## 🎯 Quick Start Deployment

The fastest way to deploy:

```bash
# 1. Build locally to verify
npm run build

# 2. Push to GitHub
git add .
git commit -m "Production ready"
git push

# 3. Deploy to Netlify
# Visit netlify.com, connect repo, deploy

# 4. Add environment variables in Netlify UI

# 5. Done! 🎉
```

---

## 📞 Support & Resources

- **Netlify Docs:** https://docs.netlify.com
- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vite Docs:** https://vitejs.dev/guide/

---

## ✅ Final Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Custom domain set up (optional)
- [ ] SSL certificate active (automatic)
- [ ] Initial data imported (products, customers)
- [ ] Admin user created
- [ ] All features tested in production
- [ ] Team members have accounts
- [ ] Discount matrix configured
- [ ] Email notifications tested
- [ ] Mobile responsiveness verified
- [ ] Error tracking configured (optional)
- [ ] Backups verified
- [ ] Documentation reviewed
- [ ] Training completed for users

---

## 🎊 Congratulations!

Your Special Offices Quotation Management System is now live in production!

**Next Steps:**
1. Train your team
2. Import your data
3. Start creating quotations
4. Monitor performance
5. Gather user feedback

**Need Help?**
- Review the documentation
- Check Supabase logs for database issues
- Check hosting provider logs for deployment issues
- Verify all environment variables are set correctly

---

**Last Updated:** 2025-11-03
**Version:** 1.0.0
