#!/usr/bin/env python3
"""
Script to create the required storage bucket in Supabase for ClaimWise
"""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

def setup_storage():
    """Create the policies bucket in Supabase storage"""
    
    # Initialize Supabase client with service role key for admin operations
    supabase_url = os.getenv("SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE")
    
    if not supabase_url or not service_role_key:
        print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in .env file")
        return False
    
    try:
        # Create client with service role key for admin operations
        supabase = create_client(supabase_url, service_role_key)
        print(f"Connected to Supabase at: {supabase_url}")
        
        # Try to create the policies-bucket
        bucket_name = "policies-bucket"
        
        # Check if bucket already exists
        try:
            buckets = supabase.storage.list_buckets()
            existing_buckets = [bucket.name for bucket in buckets]
            print(f"Existing buckets: {existing_buckets}")
            
            if bucket_name in existing_buckets:
                print(f"✅ Bucket '{bucket_name}' already exists!")
                return True
                
        except Exception as e:
            print(f"Warning: Could not list existing buckets: {e}")
        
        # Create the bucket
        print(f"Creating bucket: {bucket_name}")
        result = supabase.storage.create_bucket(bucket_name)
        
        print(f"✅ Successfully created bucket: {bucket_name}")
        print(f"Bucket details: {result}")
        
        # Set up bucket policy to allow authenticated users to upload/read their own files
        try:
            # This policy allows users to upload and read files in their own folder
            policy_sql = f"""
            CREATE POLICY "Users can upload their own files" ON storage.objects
            FOR INSERT TO authenticated
            WITH CHECK (bucket_id = '{bucket_name}' AND auth.uid()::text = (storage.foldername(name))[1]);
            
            CREATE POLICY "Users can read their own files" ON storage.objects  
            FOR SELECT TO authenticated
            USING (bucket_id = '{bucket_name}' AND auth.uid()::text = (storage.foldername(name))[1]);
            """
            
            print("Setting up storage policies...")
            # Note: Policy creation would need to be done via Supabase dashboard or SQL
            print("⚠️  Please set up storage policies in Supabase dashboard:")
            print("1. Go to Storage > Policies in your Supabase dashboard")
            print("2. Add policies to allow authenticated users to manage their own files")
            
        except Exception as e:
            print(f"Warning: Could not set up policies automatically: {e}")
            print("Please set up storage policies manually in Supabase dashboard")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating bucket: {e}")
        print(f"Error type: {type(e)}")
        return False

if __name__ == "__main__":
    print("Setting up ClaimWise storage...")
    success = setup_storage()
    if success:
        print("✅ Storage setup completed successfully!")
        print("You can now upload files to the backend.")
    else:
        print("❌ Storage setup failed. Please check the errors above.")
