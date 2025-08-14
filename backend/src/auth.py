import os 
from supabase.client import create_client, Client
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from functools import lru_cache

# intialzing supbasae client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables must be set")
supabase: Client = create_client(supabase_url, supabase_key)

#Oauth 2 scheme for token 
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# secret key for jwt 
SECRET_KEY = os.getenv("SECRET_KEY","your_secret_key")# fallback for testing
ALGORITHM = ["HS256"]  

@lru_cache(maxsize=128)
def decode_token(token: str)-> str:
    """
    decode and verify a jwt toekn 

    args: 
    token (str): The JWT token to decode and verify.

    Returns:
    str: user id 

    raised error : if token is invalid
    """

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        user_id = payload.get("sub")
        if user_id is None:
            raise JWTError("Invalid authentication credentials")
        return str(user_id)
    except JWTError:
        raise
    
async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    verify jwt token and extract user id

    args :
    token (str) jwt from Authorization header

    returins :
    str : user id 

    raised error : if token is invalid
    """
    try:
        user_id=decode_token(token)
        return user_id
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def refresh_token(refresh_token: str):
    """
    Refresh an access token using a refresh token.
    
    Args:
        refresh_token (str): Refresh token from client.
    
    Returns:
        dict: New access and refresh tokens.
    """
    try:
        response = supabase.auth.refresh_session(refresh_token)
        session = getattr(response, "session", None)
        if session is None:
            raise HTTPException(status_code=400, detail="No session returned from Supabase.")
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Refresh failed: {str(e)}")
    