-- ClaimWise Database Schema - Fix for Auth User Sync
-- This schema matches your existing database structure

-- Enable Row Level Security on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

-- Create RLS policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user registration (matching your schema)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    new.id,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)  -- fallback to email prefix
    )
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- User already exists, just return
    RETURN new;
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Ensure activities table has Row Level Security and appropriate policies
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on activities to avoid conflicts
DROP POLICY IF EXISTS "Users can insert activities" ON public.activities;
DROP POLICY IF EXISTS "Users can view their activities" ON public.activities;

-- Allow users to select their own activities
CREATE POLICY "Users can view their activities" ON public.activities
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert activities only for their own user_id
-- Note: for INSERT rules, use WITH CHECK to validate the row being inserted
CREATE POLICY "Users can insert activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Optionally allow update/delete by owner
DROP POLICY IF EXISTS "Users can modify their activities" ON public.activities;
CREATE POLICY "Users can modify their activities" ON public.activities
  FOR UPDATE, DELETE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
