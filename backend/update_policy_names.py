"""
Utility script to update policy names in the database with more meaningful names.
Run this to give your test policies better display names.
"""

from src.db import supabase
import random

def update_policy_names():
    """Update existing policies with more meaningful names."""
    
    # Sample policy names for different types
    sample_names = [
        "StarHealth Family Insurance",
        "HDFC ERGO Car Insurance", 
        "LIC Jeevan Anand Life Policy",
        "Bajaj Allianz Home Shield",
        "Max Bupa Health Companion",
        "ICICI Lombard Motor Insurance",
        "Reliance General Health Policy",
        "SBI Life Insurance Plan",
        "Tata AIG Travel Insurance",
        "Oriental Insurance Home Plan"
    ]
    
    try:
        # Get all existing policies
        result = supabase.table("policies").select("id, policy_name").execute()
        policies = result.data
        
        print(f"Found {len(policies)} policies to update")
        
        for i, policy in enumerate(policies):
            current_name = policy.get("policy_name", "")
            
            # Only update if it's a generic/test name
            if current_name in ["Test Policy", "", None] or "test" in current_name.lower():
                new_name = sample_names[i % len(sample_names)]
                
                # Update the policy name
                update_result = supabase.table("policies").update({
                    "policy_name": new_name
                }).eq("id", policy["id"]).execute()
                
                print(f"Updated policy {policy['id'][:8]} from '{current_name}' to '{new_name}'")
            else:
                print(f"Keeping existing name for policy {policy['id'][:8]}: '{current_name}'")
                
        print("Policy names update completed!")
        
    except Exception as e:
        print(f"Error updating policy names: {e}")

def show_current_policies():
    """Show current policy names in the database."""
    try:
        result = supabase.table("policies").select("id, policy_name, policy_number, created_at").execute()
        policies = result.data
        
        print(f"\nCurrent policies in database ({len(policies)} total):")
        print("-" * 60)
        for policy in policies:
            print(f"ID: {policy['id'][:8]}")
            print(f"Name: {policy.get('policy_name', 'None')}")
            print(f"Number: {policy.get('policy_number', 'None')}")
            print(f"Created: {policy.get('created_at', 'None')}")
            print("-" * 30)
            
    except Exception as e:
        print(f"Error fetching policies: {e}")

if __name__ == "__main__":
    print("Policy Name Updater")
    print("==================")
    
    show_current_policies()
    
    response = input("\nDo you want to update policy names? (y/n): ").lower().strip()
    if response == 'y':
        update_policy_names()
        print("\nUpdated policies:")
        show_current_policies()
    else:
        print("No changes made.")
