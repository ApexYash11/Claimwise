from dotenv import load_dotenv
import os
load_dotenv()

from supabase.client import create_client, Client

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if url is None or key is None:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
supabase: Client = create_client(url, key)


