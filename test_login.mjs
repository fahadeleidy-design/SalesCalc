import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  { email: 'admin@special-offices.com', role: 'admin' },
  { email: 'olashin@special-offices.com', role: 'admin' },
  { email: 'asalama@special-offices.com', role: 'sales' },
  { email: 'a.ayman@special-offices.com', role: 'engineering' },
  { email: 'alaa.moaz@special-offices.com', role: 'manager' },
  { email: 'afarraj@special-offices.com', role: 'ceo' },
];

const password = 'TestPass123';

console.log('Testing login for users with password: TestPass123\n');
console.log('='.repeat(70));

for (const testUser of testUsers) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: password,
    });

    if (error) {
      console.log(`❌ FAILED: ${testUser.email} (${testUser.role})`);
      console.log(`   Error: ${error.message}\n`);
    } else if (data.session) {
      console.log(`✅ SUCCESS: ${testUser.email} (${testUser.role})`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Session expires: ${new Date(data.session.expires_at * 1000).toISOString()}\n`);

      await supabase.auth.signOut();
    } else {
      console.log(`⚠️  WARNING: ${testUser.email} (${testUser.role})`);
      console.log(`   Login returned but no session created\n`);
    }
  } catch (err) {
    console.log(`❌ ERROR: ${testUser.email} (${testUser.role})`);
    console.log(`   ${err.message}\n`);
  }
}

console.log('='.repeat(70));
console.log('\nTest complete!');
process.exit(0);
