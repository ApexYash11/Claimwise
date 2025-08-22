#!/usr/bin/env python3
"""
Test script to check Supabase storage bucket access
"""
import os
from dotenv import load_dotenv
from src.db import supabase, supabase_storage

load_dotenv()

def test_storage_access():
    """Test if we can access Supabase storage buckets"""
    
    print("Testing Supabase storage access...")
    print(f"Using Supabase URL: {os.getenv('SUPABASE_URL')}")
    
    try:
        # Test 1: List all buckets with service role
        print("\n1. Listing all buckets with service role...")
        buckets = supabase_storage.storage.list_buckets()
        print(f"Found {len(buckets)} buckets:")
        for bucket in buckets:
            print(f"  - {bucket.name} (ID: {bucket.id}, Public: {bucket.public})")
        
        # Test 2: Try to access the "project" bucket specifically
        print("\n2. Testing 'project' bucket access...")
        try:
            files = supabase_storage.storage.from_("project").list()
            print(f"✅ Successfully accessed 'project' bucket. Found {len(files)} items.")
            for file in files[:5]:  # Show first 5 items
                print(f"  - {file.get('name', 'unnamed')}")
        except Exception as e:
            print(f"❌ Error accessing 'project' bucket: {e}")
        
        # Test 3: Try uploading a small test file
        print("\n3. Testing file upload to 'project' bucket...")
        test_content = b"This is a test file for ClaimWise"
        test_path = "test/test_file.txt"
        
        try:
            result = supabase_storage.storage.from_("project").upload(test_path, test_content)
            print(f"✅ Test file uploaded successfully: {result}")
            
            # Try to get public URL
            url = supabase_storage.storage.from_("project").get_public_url(test_path)
            print(f"✅ Public URL generated: {url}")
            
        except Exception as e:
            print(f"❌ Error uploading test file: {e}")
            print(f"Error type: {type(e)}")
            
    except Exception as e:
        print(f"❌ General storage error: {e}")
        print(f"Error type: {type(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_storage_access()
