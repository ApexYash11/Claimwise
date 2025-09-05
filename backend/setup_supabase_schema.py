#!/usr/bin/env python3
"""
Setup script to create the necessary database schema for Supabase authentication.
This script will create the users table and associated triggers/functions.
"""

import os
import sys
from pathlib import Path

# Add the src directory to the path
sys.path.append(str(Path(__file__).parent / "src"))

from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_database_schema():
    """Create the users table and related functions in Supabase"""
    
    # Get Supabase credentials
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")  # Need service key for admin operations
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required")
        print("You can find these in your Supabase project settings:")
        print("1. Go to https://supabase.com/dashboard/project/[your-project]/settings/api")
        print("2. Copy the Project URL and service_role key")
        return False

    # Create Supabase client with service key
    supabase: Client = create_client(url, key)
    
    # Read the schema file
    schema_file = Path(__file__).parent / "src" / "supabase_schema.sql"
    
    if not schema_file.exists():
        print(f"❌ Error: Schema file not found: {schema_file}")
        return False
    
    with open(schema_file, 'r') as f:
        schema_sql = f.read()
    
    try:
        print("🔧 Setting up database schema...")
        
        # Execute the schema SQL
        result = supabase.rpc('exec_sql', {'sql': schema_sql}).execute()
        
        print("✅ Database schema created successfully!")
        print("🎉 Email signup should now work properly!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating schema: {e}")
        print("\nAlternative setup method:")
        print("1. Go to your Supabase dashboard")
        print("2. Navigate to the SQL Editor")
        print("3. Copy and paste the contents of 'src/supabase_schema.sql'")
        print("4. Run the SQL query")
        return False

if __name__ == "__main__":
    print("🚀 ClaimWise Database Schema Setup")
    print("=" * 40)
    
    success = setup_database_schema()
    
    if success:
        print("\n🎯 Next steps:")
        print("1. Try email signup again - it should work now!")
        print("2. The users table will automatically create profiles for new signups")
    else:
        print("\n🔧 Manual setup required:")
        print("1. Check your Supabase environment variables")
        print("2. Or run the SQL manually in Supabase dashboard")
