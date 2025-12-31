import os 
from supabase.client import create_client, Client
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from functools import lru_cache
import logging

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
    Supports tokens from email/password and social authentication (Google, GitHub).

    Args: 
        token (str): The JWT token to decode and verify.

    Returns:
        str: user id from token payload

    Raises:
        JWTError: if token is invalid or verification fails
    """
    try:
        logger = logging.getLogger(__name__)
        logger.debug("Decoding token")
        jwt_secret: str = SUPABASE_JWT_SECRET  # type: ignore
        payload = jwt.decode(token, jwt_secret, algorithms=ALGORITHM, options={"verify_aud": True}, audience="authenticated")
        logger.debug("Decoded payload keys: %s", list(payload.keys()))
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("[Auth] Missing 'sub' claim in JWT payload")
            raise JWTError("Invalid authentication credentials: missing 'sub' claim")
        
        logger.debug("[Auth] User ID extracted from token: %s", user_id)
        return str(user_id)
    except JWTError as e:
        logging.getLogger(__name__).exception("[Auth] JWTError during token decode: %s", str(e))
        raise
    
async def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Verify JWT token and extract user ID.
    Works with both email/password and OAuth (Google/GitHub) tokens.

    Args:
        token (str): JWT from Authorization header

    Returns:
        str: User ID

    Raises:
        HTTPException: If token is invalid or verification fails
    """
    try:
        logger = logging.getLogger(__name__)
        logger.debug("[Auth] get_current_user called")
        
        user_id = decode_token(token)
        logger.debug("[Auth] User authenticated: %s", user_id)
        return user_id
    except JWTError as e:
        logger = logging.getLogger(__name__)
        logger.warning("[Auth] JWT verification failed: %s", str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.exception("[Auth] Unexpected error in get_current_user: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
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
    