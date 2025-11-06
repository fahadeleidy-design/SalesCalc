#!/usr/bin/env python3
"""
Complete Approval Workflow Test via Supabase REST API

This script tests the full approval workflow:
1. Sales Rep creates/submits quotation
2. Sales Manager approves
3. Engineering approves (if needed)
4. Finance approves (if needed)
5. CEO gives final approval
"""

import requests
import json
from datetime import datetime

# Supabase configuration
SUPABASE_URL = "https://qxqbvpgbkxlxwdmtfqwl.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cWJ2cGdia3hseHdkbXRmcXdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA3MzU5MTcsImV4cCI6MjA0NjMxMTkxN30.Pu1xUDYLWqy8_kWjQNqQZKGYfzFuKPHhWOxhF-zOzHs"

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

def print_section(title):
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}\n")

def get_quotation(quotation_number):
    """Get quotation by number"""
    url = f"{SUPABASE_URL}/rest/v1/quotations"
    params = {
        "quotation_number": f"eq.{quotation_number}",
        "select": "*"
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200 and response.json():
        return response.json()[0]
    return None

def get_user_by_email(email):
    """Get user profile by email"""
    url = f"{SUPABASE_URL}/rest/v1/profiles"
    params = {
        "email": f"eq.{email}",
        "select": "*"
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200 and response.json():
        return response.json()[0]
    return None

def update_quotation_status(quotation_id, status, updated_by=None):
    """Update quotation status"""
    url = f"{SUPABASE_URL}/rest/v1/quotations"
    params = {"id": f"eq.{quotation_id}"}
    
    data = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    response = requests.patch(url, headers=headers, params=params, json=data)
    return response.status_code in [200, 204]

def create_approval_history(quotation_id, approver_id, approver_role, action, comments=""):
    """Create approval history entry"""
    url = f"{SUPABASE_URL}/rest/v1/approval_history"
    
    data = {
        "quotation_id": quotation_id,
        "approver_id": approver_id,
        "approver_role": approver_role,
        "action": action,
        "comments": comments,
        "created_at": datetime.utcnow().isoformat()
    }
    
    response = requests.post(url, headers=headers, json=data)
    return response.status_code in [200, 201]

def get_approval_history(quotation_id):
    """Get approval history for a quotation"""
    url = f"{SUPABASE_URL}/rest/v1/approval_history"
    params = {
        "quotation_id": f"eq.{quotation_id}",
        "select": "*,approver:profiles(full_name,email,role)",
        "order": "created_at.asc"
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    return []

def main():
    print_section("SALES QUOTATION APPROVAL WORKFLOW TEST")
    
    # Step 1: Get the quotation
    print_section("Step 1: Finding Quotation")
    quotation_number = "QUO-1762266942896"
    quotation = get_quotation(quotation_number)
    
    if not quotation:
        print(f"❌ Quotation {quotation_number} not found!")
        return
    
    print(f"✅ Found quotation: {quotation['quotation_number']}")
    print(f"   Title: {quotation['title']}")
    print(f"   Total: SAR {quotation['total']:,.2f}")
    print(f"   Current Status: {quotation['status']}")
    print(f"   ID: {quotation['id']}")
    
    quotation_id = quotation['id']
    
    # Step 2: Get user profiles
    print_section("Step 2: Getting User Profiles")
    
    users = {
        'sales': get_user_by_email('sales@special-offices.com'),
        'manager': get_user_by_email('manager@special-offices.com'),
        'engineering': get_user_by_email('engineering@special-offices.com'),
        'finance': get_user_by_email('finance@special-offices.com'),
        'ceo': get_user_by_email('ceo@special-offices.com')
    }
    
    for role, user in users.items():
        if user:
            print(f"✅ {role.capitalize()}: {user['full_name']} ({user['email']})")
        else:
            print(f"❌ {role.capitalize()}: Not found!")
    
    if not all(users.values()):
        print("\n❌ Some users not found. Cannot proceed.")
        return
    
    # Step 3: Submit for approval (Sales Rep → Manager)
    print_section("Step 3: Submitting for Manager Approval")
    
    if update_quotation_status(quotation_id, 'pending_manager'):
        print("✅ Quotation status updated to 'pending_manager'")
        
        if create_approval_history(
            quotation_id,
            users['sales']['id'],
            'sales',
            'submitted',
            'Quotation submitted for manager approval'
        ):
            print("✅ Approval history created for submission")
        else:
            print("❌ Failed to create approval history")
    else:
        print("❌ Failed to update quotation status")
    
    # Step 4: Manager Approval
    print_section("Step 4: Manager Approval")
    
    if update_quotation_status(quotation_id, 'pending_engineering'):
        print("✅ Manager approved - Status updated to 'pending_engineering'")
        
        if create_approval_history(
            quotation_id,
            users['manager']['id'],
            'manager',
            'approved',
            'Approved by Sales Manager. Forwarding to Engineering for custom item review.'
        ):
            print("✅ Approval history created for manager approval")
    else:
        print("❌ Failed to update status after manager approval")
    
    # Step 5: Engineering Approval
    print_section("Step 5: Engineering Approval")
    
    if update_quotation_status(quotation_id, 'pending_finance'):
        print("✅ Engineering approved - Status updated to 'pending_finance'")
        
        if create_approval_history(
            quotation_id,
            users['engineering']['id'],
            'engineering',
            'approved',
            'Technical review completed. All specifications approved.'
        ):
            print("✅ Approval history created for engineering approval")
    else:
        print("❌ Failed to update status after engineering approval")
    
    # Step 6: Finance Approval
    print_section("Step 6: Finance Approval")
    
    if update_quotation_status(quotation_id, 'pending_ceo'):
        print("✅ Finance approved - Status updated to 'pending_ceo'")
        
        if create_approval_history(
            quotation_id,
            users['finance']['id'],
            'finance',
            'approved',
            'Financial review completed. Pricing and margins approved.'
        ):
            print("✅ Approval history created for finance approval")
    else:
        print("❌ Failed to update status after finance approval")
    
    # Step 7: CEO Final Approval
    print_section("Step 7: CEO Final Approval")
    
    if update_quotation_status(quotation_id, 'approved'):
        print("✅ CEO approved - Status updated to 'approved'")
        
        if create_approval_history(
            quotation_id,
            users['ceo']['id'],
            'ceo',
            'approved',
            'Final approval granted. Quotation ready to send to customer.'
        ):
            print("✅ Approval history created for CEO approval")
    else:
        print("❌ Failed to update status after CEO approval")
    
    # Step 8: Display final approval chain
    print_section("Step 8: Complete Approval Chain")
    
    history = get_approval_history(quotation_id)
    
    if history:
        print(f"Total approvals: {len(history)}\n")
        for i, entry in enumerate(history, 1):
            approver = entry.get('approver', {})
            print(f"{i}. {approver.get('full_name', 'Unknown')} ({approver.get('role', 'unknown')})")
            print(f"   Action: {entry['action']}")
            print(f"   Comments: {entry['comments']}")
            print(f"   Date: {entry['created_at']}")
            print()
    else:
        print("❌ No approval history found")
    
    # Step 9: Verify final status
    print_section("Step 9: Final Verification")
    
    final_quotation = get_quotation(quotation_number)
    if final_quotation:
        print(f"✅ Final Status: {final_quotation['status']}")
        print(f"   Quotation Number: {final_quotation['quotation_number']}")
        print(f"   Total Value: SAR {final_quotation['total']:,.2f}")
        
        if final_quotation['status'] == 'approved':
            print("\n🎉 SUCCESS! Complete approval workflow executed successfully!")
            print("   Sales Rep → Manager → Engineering → Finance → CEO → APPROVED")
        else:
            print(f"\n⚠️  Workflow incomplete. Final status: {final_quotation['status']}")
    else:
        print("❌ Could not verify final status")
    
    print_section("TEST COMPLETE")

if __name__ == "__main__":
    main()
