/**
 * Script to create production users with proper Supabase Auth integration
 * 
 * Usage:
 * 1. Set environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: node scripts/create-production-users.js
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Production users to create
const productionUsers = [
  // CEO
  { email: 'feleidy@special-offices.com', full_name: 'Fahad Aleidy', role: 'ceo', password: 'demo123' },
  
  // Sales Team
  { email: 'msalah@special-offices.com', full_name: 'Mohamed Salah', role: 'sales', password: 'demo123' },
  { email: 'afarraj@special-offices.com', full_name: 'Ahmed Farraj', role: 'sales', password: 'demo123' },
  { email: 'ralsaeed@special-offices.com', full_name: 'Rami AlSaeed', role: 'sales', password: 'demo123' },
  { email: 'lalmutairi@special-offices.com', full_name: 'Layla AlMutairi', role: 'sales', password: 'demo123' },
  { email: 'kalzahrani@special-offices.com', full_name: 'Khalid AlZahrani', role: 'sales', password: 'demo123' },
  
  // Engineering Team
  { email: 'yalharthi@special-offices.com', full_name: 'Youssef AlHarthi', role: 'engineering', password: 'demo123' },
  { email: 'salkhatib@special-offices.com', full_name: 'Sara AlKhatib', role: 'engineering', password: 'demo123' },
  { email: 'oalshammari@special-offices.com', full_name: 'Omar AlShammari', role: 'engineering', password: 'demo123' },
  { email: 'naljuhani@special-offices.com', full_name: 'Nora AlJuhani', role: 'engineering', password: 'demo123' },
  
  // Managers
  { email: 'aalghamdi@special-offices.com', full_name: 'Abdullah AlGhamdi', role: 'manager', password: 'demo123' },
  { email: 'malqahtani@special-offices.com', full_name: 'Maha AlQahtani', role: 'manager', password: 'demo123' },
  { email: 'talbilali@special-offices.com', full_name: 'Tariq AlBilali', role: 'manager', password: 'demo123' },
  
  // Finance Team
  { email: 'halmansour@special-offices.com', full_name: 'Hanan AlMansour', role: 'finance', password: 'demo123' },
  { email: 'falotaibi@special-offices.com', full_name: 'Faisal AlOtaibi', role: 'finance', password: 'demo123' },
  { email: 'dalharbi@special-offices.com', full_name: 'Dana AlHarbi', role: 'finance', password: 'demo123' },
  
  // Admin Team
  { email: 'ialsubaie@special-offices.com', full_name: 'Ibrahim AlSubaie', role: 'admin', password: 'demo123' },
  { email: 'ralmutlaq@special-offices.com', full_name: 'Reem AlMutlaq', role: 'admin', password: 'demo123' },
  { email: 'maldosari@special-offices.com', full_name: 'Majed AlDosari', role: 'admin', password: 'demo123' },
  { email: 'salbader@special-offices.com', full_name: 'Salma AlBader', role: 'admin', password: 'demo123' },
  { email: 'walrashid@special-offices.com', full_name: 'Waleed AlRashid', role: 'admin', password: 'demo123' },
];

async function createUser(userData) {
  try {
    console.log(`Creating user: ${userData.email}...`);
    
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: userData.full_name
      }
    });
    
    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already registered')) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        return { success: true, skipped: true };
      }
      throw authError;
    }
    
    if (!authData.user) {
      throw new Error('No user data returned');
    }
    
    // Step 2: Update profile with correct role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: userData.role,
        full_name: userData.full_name 
      })
      .eq('id', authData.user.id);
    
    if (profileError) {
      console.error(`❌ Failed to update profile for ${userData.email}:`, profileError);
      return { success: false, error: profileError };
    }
    
    console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    return { success: true, userId: authData.user.id };
    
  } catch (error) {
    console.error(`❌ Error creating user ${userData.email}:`, error.message);
    return { success: false, error };
  }
}

async function main() {
  console.log('🚀 Starting production user creation...\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  
  for (const user of productionUsers) {
    const result = await createUser(user);
    if (result.success) {
      if (result.skipped) {
        skipCount++;
      } else {
        successCount++;
      }
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`⚠️  Skipped (already exist): ${skipCount} users`);
  console.log(`❌ Failed: ${failCount} users`);
  console.log(`\n🎉 Done! All users can now login with password: demo123`);
}

main().catch(console.error);
