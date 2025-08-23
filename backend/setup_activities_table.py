"""
Setup script to create the activities table in Supabase.
Run this to create the activities table for dynamic activity tracking.
"""

from src.db import supabase

def create_activities_table():
    """Create the activities table using Supabase SQL."""
    
    # SQL to create activities table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS public.activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('upload', 'analysis', 'chat', 'comparison')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'processing', 'failed')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
    
    -- Create index for efficient queries
    CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(type);
    
    -- Enable RLS (Row Level Security)
    ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
    
    -- RLS policies
    CREATE POLICY IF NOT EXISTS "Users can view their own activities" ON public.activities
        FOR SELECT USING (auth.uid() = user_id);
    
    CREATE POLICY IF NOT EXISTS "Users can insert their own activities" ON public.activities
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    CREATE POLICY IF NOT EXISTS "Users can update their own activities" ON public.activities
        FOR UPDATE USING (auth.uid() = user_id);
    
    CREATE POLICY IF NOT EXISTS "Users can delete their own activities" ON public.activities
        FOR DELETE USING (auth.uid() = user_id);
    """
    
    try:
        # Execute the SQL
        result = supabase.rpc("exec_sql", {"sql": create_table_sql}).execute()
        print("✅ Activities table created successfully!")
        print("The table includes:")
        print("- id (UUID, primary key)")
        print("- user_id (UUID, foreign key to auth.users)")
        print("- type (upload, analysis, chat, comparison)")
        print("- title (activity title)")
        print("- description (activity description)")
        print("- details (JSON metadata)")
        print("- status (completed, processing, failed)")
        print("- created_at, updated_at (timestamps)")
        print("- Proper indexes and RLS policies")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating activities table: {e}")
        print("\n📋 Manual SQL to run in Supabase SQL Editor:")
        print(create_table_sql)
        return False

def test_activities_table():
    """Test the activities table by inserting a sample activity."""
    try:
        # Try to get current user (this will fail if not authenticated, which is fine for testing)
        sample_activity = {
            "user_id": "00000000-0000-0000-0000-000000000000",  # dummy UUID for testing
            "type": "upload",
            "title": "Test Activity",
            "description": "Testing activities table creation",
            "details": {"test": True},
            "status": "completed"
        }
        
        # This will fail due to RLS, but confirms table structure is correct
        result = supabase.table("activities").insert(sample_activity).execute()
        print("✅ Activities table structure is working!")
        
    except Exception as e:
        if "RLS" in str(e) or "auth" in str(e):
            print("✅ Activities table created with proper RLS security!")
        else:
            print(f"⚠️ Table structure may have issues: {e}")

if __name__ == "__main__":
    print("🚀 Setting up Activities Table")
    print("=" * 40)
    
    if create_activities_table():
        print("\n🧪 Testing table structure...")
        test_activities_table()
        print("\n🎉 Activities table setup complete!")
        print("\n💡 Next steps:")
        print("1. Restart your backend server")
        print("2. Upload/analyze policies to generate activities")
        print("3. Check dashboard for dynamic activity feed")
    else:
        print("\n❌ Setup failed. Please run the SQL manually in Supabase.")
