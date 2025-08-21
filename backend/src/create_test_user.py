from dotenv import load_dotenv
load_dotenv()
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in your .env file.")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def create_and_login_test_user(email, password):
    # Create user
    user_resp = supabase.auth.admin.create_user({"email": email, "password": password, "email_confirm": True})
    print("User creation response:", user_resp)
    # Login user
    login_resp = supabase.auth.sign_in_with_password({"email": email, "password": password})
    print("Login response:", login_resp)
    session = getattr(login_resp, "session", None)
    if session:
        print("Access token:", session.access_token)
        print("Refresh token:", session.refresh_token)
    else:
        print("No session returned. Check user creation and credentials.")

if __name__ == "__main__":
    test_email = "testuser_claimwise@example.com"
    test_password = "TestUser123!"
    create_and_login_test_user(test_email, test_password)
