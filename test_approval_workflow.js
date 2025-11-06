/**
 * Manual Approval Workflow Test Script
 * 
 * This script simulates the complete approval workflow by directly updating
 * the quotation status in the database.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Quotation ID to test (the smaller one without custom items)
const QUOTATION_ID = 'QUO-1762266942896'; // Future Systems - SAR 23,287.50

async function testApprovalWorkflow() {
  console.log('🚀 Starting Approval Workflow Test\n');
  
  // Step 1: Get quotation details
  console.log('📋 Step 1: Fetching quotation details...');
  const { data: quotation, error: fetchError } = await supabase
    .from('quotations')
    .select('*')
    .eq('quotation_number', QUOTATION_ID)
    .single();
  
  if (fetchError || !quotation) {
    console.error('❌ Error fetching quotation:', fetchError);
    return;
  }
  
  console.log(`✅ Found quotation: ${quotation.title}`);
  console.log(`   Customer ID: ${quotation.customer_id}`);
  console.log(`   Total: SAR ${quotation.total}`);
  console.log(`   Current Status: ${quotation.status}\n`);
  
  // Step 2: Submit for Manager Approval
  console.log('📤 Step 2: Submitting for Manager Approval...');
  const { error: submitError } = await supabase
    .from('quotations')
    .update({ 
      status: 'pending_manager',
      updated_at: new Date().toISOString()
    })
    .eq('id', quotation.id);
  
  if (submitError) {
    console.error('❌ Error submitting:', submitError);
    return;
  }
  
  console.log('✅ Status updated to: pending_manager\n');
  
  console.log('✨ Workflow test complete!');
  console.log('\nNext steps:');
  console.log('1. Log in as Sales Manager (manager@special-offices.com)');
  console.log('2. Navigate to Approvals section');
  console.log('3. Approve the quotation');
  console.log('4. Repeat for Engineering, Finance, and CEO roles');
}

testApprovalWorkflow().catch(console.error);
