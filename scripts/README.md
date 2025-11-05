# Production User Creation Scripts

This directory contains scripts to properly create production users with Supabase Auth integration.

## Problem

The original migration (`20251105063400_create_all_team_users.sql`) used PostgreSQL's `crypt()` function to hash passwords, which is **not compatible** with Supabase Auth. Users created this way cannot log in through the application.

## Solution

Use the Supabase Admin API to create users properly, which integrates with Supabase Auth.

## Usage

### Option 1: Run the Node.js Script (Recommended)

1. **Install dependencies:**
   ```bash
   cd scripts
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export SUPABASE_URL="https://eugjmayuqlvddefnkysp.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
   ```

   Get your service role key from:
   - Supabase Dashboard → Project Settings → API → `service_role` key

3. **Run the script:**
   ```bash
   npm run create-users
   ```

   Or directly:
   ```bash
   node create-production-users.js
   ```

### Option 2: Manual Creation via Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/eugjmayuqlvddefnkysp
2. Navigate to **Authentication** → **Users**
3. Click **"Add User"**
4. Fill in:
   - Email: (user email from the list below)
   - Password: `demo123`
   - Auto Confirm User: ✅ (checked)
5. After creating, go to **Database** → **Table Editor** → **profiles**
6. Find the user and update their `role` field

### Option 3: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref eugjmayuqlvddefnkysp

# Create users via SQL (requires additional setup)
supabase db push
```

## Production Users List

All users have password: `demo123`

### CEO (1)
- feleidy@special-offices.com - Fahad Aleidy

### Sales Team (5)
- msalah@special-offices.com - Mohamed Salah
- afarraj@special-offices.com - Ahmed Farraj
- ralsaeed@special-offices.com - Rami AlSaeed
- lalmutairi@special-offices.com - Layla AlMutairi
- kalzahrani@special-offices.com - Khalid AlZahrani

### Engineering Team (4)
- yalharthi@special-offices.com - Youssef AlHarthi
- salkhatib@special-offices.com - Sara AlKhatib
- oalshammari@special-offices.com - Omar AlShammari
- naljuhani@special-offices.com - Nora AlJuhani

### Managers (3)
- aalghamdi@special-offices.com - Abdullah AlGhamdi
- malqahtani@special-offices.com - Maha AlQahtani
- talbilali@special-offices.com - Tariq AlBilali

### Finance Team (3)
- halmansour@special-offices.com - Hanan AlMansour
- falotaibi@special-offices.com - Faisal AlOtaibi
- dalharbi@special-offices.com - Dana AlHarbi

### Admin Team (5)
- ialsubaie@special-offices.com - Ibrahim AlSubaie
- ralmutlaq@special-offices.com - Reem AlMutlaq
- maldosari@special-offices.com - Majed AlDosari
- salbader@special-offices.com - Salma AlBader
- walrashid@special-offices.com - Waleed AlRashid

## Security Note

⚠️ **IMPORTANT:** The `SUPABASE_SERVICE_ROLE_KEY` has full admin access to your database. 
- Never commit it to git
- Never expose it in client-side code
- Only use it in secure server environments
- Rotate it immediately if compromised

## Verification

After creating users, verify they can log in:

1. Go to https://salesquotationcalc.netlify.app/
2. Try logging in with any of the emails above
3. Password: `demo123`
4. Verify the correct dashboard loads for each role
