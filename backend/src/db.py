from dotenv import load_dotenv
import os
load_dotenv()

from supabase.client import create_client, Client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
service_role_key = os.getenv("SUPABASE_SERVICE_ROLE")

if url is None or key is None:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")

# Main client for database operations (uses anon key + JWT auth)
supabase: Client = create_client(url, key)

# Storage client for file operations (uses service role key for storage access)
if service_role_key:
    supabase_storage: Client = create_client(url, service_role_key)
else:
    print("Warning: SUPABASE_SERVICE_ROLE not found, using anon key for storage (may have limited permissions)")
    supabase_storage = supabase


