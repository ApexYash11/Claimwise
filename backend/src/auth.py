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

# Supabase JWT secret for token verification
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET environment variable must be set")

ALGORITHM = ["HS256"]  # Supabase Legacy JWT uses HS256 for signing

@lru_cache(maxsize=128)
def decode_token(token: str) -> str:
    """
    Decode and verify a Supabase-issued JWT token.
    Supports tokens from email/password and social authentication.

    Args: 
        token (str): The JWT token to decode and verify.

    Returns:
        str: user id from token payload

    Raises:
        JWTError: if token is invalid or verification fails
    """
    try:
        # Type assertion since we've already checked SUPABASE_JWT_SECRET is not None
        jwt_secret: str = SUPABASE_JWT_SECRET  # type: ignore
        payload = jwt.decode(token, jwt_secret, algorithms=ALGORITHM)
        user_id = payload.get("sub")
        if user_id is None:
            raise JWTError("Invalid authentication credentials: missing 'sub' claim")
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
    