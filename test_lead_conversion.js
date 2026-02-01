import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testLeadConversion() {
  console.log('=== Lead Conversion Test ===\n');

  // Test lead ID from the screenshot
  const leadId = 'f742e6c7-5534-4ae2-a771-97d9839c1655';

  try {
    // Step 1: Check if lead exists
    console.log('Step 1: Checking if lead exists...');
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError) {
      console.error('❌ Error fetching lead:', leadError);
      console.error('This means the current user cannot read this lead due to RLS policies');
      return;
    }

    console.log('✅ Lead found:', {
      id: lead.id,
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      assigned_to: lead.assigned_to,
      lead_status: lead.lead_status
    });

    // Step 2: Check current user profile
    console.log('\nStep 2: Checking current user profile...');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('❌ No authenticated user');
      return;
    }

    console.log('✅ Current user ID:', user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError);
      return;
    }

    console.log('✅ User profile:', {
      profile_id: profile.id,
      role: profile.role,
      full_name: profile.full_name
    });

    // Step 3: Attempt conversion
    console.log('\nStep 3: Attempting lead conversion...');
    const { data: opportunityId, error: conversionError } = await supabase.rpc(
      'convert_lead_to_opportunity',
      { p_lead_id: leadId }
    );

    if (conversionError) {
      console.error('❌ Conversion failed:', conversionError);
      console.error('Error details:', {
        message: conversionError.message,
        details: conversionError.details,
        hint: conversionError.hint,
        code: conversionError.code
      });
      return;
    }

    console.log('✅ Conversion successful!');
    console.log('Created opportunity ID:', opportunityId);

    // Step 4: Verify conversion
    console.log('\nStep 4: Verifying conversion...');
    const { data: updatedLead } = await supabase
      .from('crm_leads')
      .select('lead_status, converted_to_customer_id')
      .eq('id', leadId)
      .single();

    console.log('✅ Lead updated:', {
      status: updatedLead.lead_status,
      customer_id: updatedLead.converted_to_customer_id
    });

    const { data: opportunity } = await supabase
      .from('crm_opportunities')
      .select('id, name, stage')
      .eq('id', opportunityId)
      .single();

    console.log('✅ Opportunity created:', opportunity);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// To use this test:
// 1. Make sure you have a valid session (login first)
// 2. Run: node test_lead_conversion.js

testLeadConversion();
