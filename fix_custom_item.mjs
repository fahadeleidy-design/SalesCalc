/**
 * Fix Custom Item Script
 * 
 * This script removes the problematic custom item blocking quotation submission
 */

import { createClient } from '@supabase/supabase-js';

// Supabase credentials (from the deployed app)
const supabaseUrl = 'https://qxqbvpgbkxlxwdmtfqwl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cWJ2cGdia3hseHdkbXRmcXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MzU5MTcsImV4cCI6MjA0NjMxMTkxN30.Pu1xUDYLWqy8_kWjQNqQZKGYfzFuKPHhWOxhF-zOzHs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixCustomItem() {
  console.log('🔧 Starting custom item fix...\n');
  
  // Step 1: Find the quotation
  console.log('📋 Step 1: Finding quotation QUO-1762165118294...');
  const { data: quotation, error: quotError } = await supabase
    .from('quotations')
    .select('id, quotation_number, total')
    .eq('quotation_number', 'QUO-1762165118294')
    .single();
  
  if (quotError || !quotation) {
    console.error('❌ Error finding quotation:', quotError);
    return;
  }
  
  console.log(`✅ Found quotation: ${quotation.quotation_number}`);
  console.log(`   ID: ${quotation.id}`);
  console.log(`   Current Total: SAR ${quotation.total}\n`);
  
  // Step 2: Find custom items
  console.log('🔍 Step 2: Finding custom items...');
  const { data: customItems, error: itemsError } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', quotation.id)
    .eq('is_custom', true);
  
  if (itemsError) {
    console.error('❌ Error finding custom items:', itemsError);
    return;
  }
  
  console.log(`✅ Found ${customItems?.length || 0} custom item(s)`);
  
  if (customItems && customItems.length > 0) {
    customItems.forEach(item => {
      console.log(`   - ${item.product_name || 'Unnamed'}: ${item.custom_item_status || 'unknown'} status`);
    });
    console.log('');
  }
  
  // Step 3: Delete custom items with zero price or pending status
  console.log('🗑️  Step 3: Deleting problematic custom items...');
  const { data: deleted, error: deleteError } = await supabase
    .from('quotation_items')
    .delete()
    .eq('quotation_id', quotation.id)
    .eq('is_custom', true)
    .or('unit_price.eq.0,custom_item_status.eq.pending')
    .select();
  
  if (deleteError) {
    console.error('❌ Error deleting custom items:', deleteError);
    return;
  }
  
  console.log(`✅ Deleted ${deleted?.length || 0} custom item(s)\n`);
  
  // Step 4: Recalculate quotation total
  console.log('💰 Step 4: Recalculating quotation total...');
  
  // Get all remaining items
  const { data: remainingItems, error: remainingError } = await supabase
    .from('quotation_items')
    .select('total')
    .eq('quotation_id', quotation.id);
  
  if (remainingError) {
    console.error('❌ Error fetching remaining items:', remainingError);
    return;
  }
  
  // Calculate subtotal
  const subtotal = remainingItems?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
  
  // Get tax rate
  const { data: quotData } = await supabase
    .from('quotations')
    .select('tax_rate')
    .eq('id', quotation.id)
    .single();
  
  const taxRate = quotData?.tax_rate || 15;
  const newTotal = subtotal * (1 + taxRate / 100);
  
  console.log(`   Subtotal: SAR ${subtotal.toFixed(2)}`);
  console.log(`   Tax (${taxRate}%): SAR ${(subtotal * taxRate / 100).toFixed(2)}`);
  console.log(`   New Total: SAR ${newTotal.toFixed(2)}\n`);
  
  // Update quotation
  const { error: updateError } = await supabase
    .from('quotations')
    .update({ 
      total: newTotal,
      updated_at: new Date().toISOString()
    })
    .eq('id', quotation.id);
  
  if (updateError) {
    console.error('❌ Error updating quotation:', updateError);
    return;
  }
  
  console.log('✅ Quotation total updated successfully!\n');
  
  console.log('🎉 Custom item fix complete!');
  console.log('\nNext steps:');
  console.log('1. Refresh the quotations page in the browser');
  console.log('2. The quotation should now be submittable');
  console.log('3. Try submitting for approval');
}

fixCustomItem().catch(console.error);
