import os 
import time 
import requests
import logging
import importlib

# Dynamically import PyPDF2 to avoid static import errors when the package
# is not installed in some environments (CI/lint). If unavailable, fall back
# to None and use model-based extraction only.
PdfReader = None
try:
    _pypdf_mod = importlib.import_module('PyPDF2')
    PdfReader = getattr(_pypdf_mod, 'PdfReader', None)
except Exception:
    PdfReader = None
from typing import Optional, Tuple
try:
    from google import genai
except Exception:
    genai = None

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Base URL for Gemini Files API (kept for backward compatibility but SDK is preferred)
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/files"

# Configuring logging
logging.basicConfig(level=logging.INFO)

# Initialize the client if possible. Make this import-safe so the module can be
# imported even when the GEMINI_API_KEY or the google.genai SDK is not present.
client = None
if not GEMINI_API_KEY:
    logging.warning("GEMINI_API_KEY not set; Gemini client disabled — local extraction only")
else:
    if genai is None:
        logging.warning("google.genai SDK not available; Gemini client cannot be initialized")
    else:
        try:
            client = genai.Client(api_key=GEMINI_API_KEY)
            logging.info("Gemini client initialized")
        except Exception as e:
            logging.error("Failed to initialize Gemini client: %s", e)
            client = None


def _file_state_to_str(state) -> Optional[str]:
    """Normalize file state (enum or str) to uppercase string like 'ACTIVE'."""
    if state is None:
        return None
    if hasattr(state, "name"):
        return state.name
    return str(state).upper().strip("'\" ")


# NOTE: These functions are kept for backward compatibility but are NOT used
# for text extraction in the current implementation. Text extraction is LOCAL-ONLY.

def upload_pdf(file_path: str) -> Tuple[str, Optional[str]]:
    """
    DEPRECATED: This function uploads to Gemini Files API but is no longer used
    for text extraction. Text extraction is now LOCAL-ONLY via PyPDF2.
    
    Kept for backward compatibility and potential future use cases.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    logging.info("Note: Gemini upload requested but text extraction is LOCAL-ONLY")

    # If the Gemini client isn't configured, return local sentinel
    if client is None:
        logging.info("Gemini client not configured; returning local sentinel")
        return "local", None

    try:
        myfile = client.files.upload(file=file_path)
        file_id = getattr(myfile, "name", None) or str(myfile)
        file_uri = getattr(myfile, "uri", None) or getattr(myfile, "download_uri", None)
        logging.info("File uploaded successfully. File ID: %s, URI: %s", file_id, file_uri)
        return file_id, file_uri
    except Exception as e:
        logging.error("Failed to upload file: %s", e)
        raise


def poll_file_status(file_id: str, timeout: int = 300, interval: int = 5) -> str:
    """
    DEPRECATED: This function polls Gemini file status but is no longer used
    for text extraction. Text extraction is now LOCAL-ONLY via PyPDF2.
    
    Kept for backward compatibility and potential future use cases.
    """
    # Defensive: if user passed the full object accidentally, try to extract .name
    if not isinstance(file_id, str):
        file_id = getattr(file_id, "name", str(file_id))

    logging.info("Polling file status for File ID: %s", file_id)

    start_time = time.time()
    # If client is not configured or we used the local sentinel, treat as ACTIVE
    if client is None or file_id == "local":
        logging.info("Gemini client not configured or local sentinel used; assuming file is ACTIVE")
        return "ACTIVE"

    while time.time() - start_time < timeout:
        try:
            # Use SDK to fetch file metadata instead of constructing raw URLs
            resp = client.files.get(name=file_id)
        except Exception as e:
            logging.error("Error fetching file metadata via SDK: %s", e)
            time.sleep(interval)
            continue

        state_str = _file_state_to_str(getattr(resp, "state", None))
        logging.info("Current status (SDK): %s", state_str)

        if state_str == "ACTIVE":
            logging.info("File is now ACTIVE")
            return state_str
        if state_str in ["FAILED", "ERROR"]:
            raise RuntimeError(f"File processing failed with status: {state_str}")

        time.sleep(interval)

    raise TimeoutError("Polling timed out before file became ACTIVE")


def extract_text(file_path: str) -> str:
    """
    Extract text strictly from a local PDF using PyPDF2.
    
    This function is LOCAL-ONLY and does NOT make any API calls.
    It only accepts local file paths and uses PyPDF2 for extraction.
    
    Args:
        file_path (str): Path to local PDF file
        
    Returns:
        str: Extracted text content
        
    Raises:
        FileNotFoundError: If the local file doesn't exist
        RuntimeError: If PyPDF2 is not available
    """
    logging.info("Extracting text from local file: %s", file_path)
    
    # Ensure we only work with local files
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Local file not found: {file_path}")

    # Ensure PyPDF2 is available
    if PdfReader is None:
        logging.error("PyPDF2 is not installed; cannot perform local extraction. Please install PyPDF2.")
        raise RuntimeError("PyPDF2 not available for local PDF extraction")

    # Extract text using PyPDF2 only
    try:
        reader = PdfReader(file_path)
        texts = []
        
        for page_num, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
                texts.append(page_text)
                logging.debug("Extracted %d characters from page %d", len(page_text), page_num + 1)
            except Exception as e:
                logging.warning("Failed to extract text from page %d: %s", page_num + 1, e)
                texts.append("")
        
        full_text = "\n".join(texts)
        logging.info("Local PDF extraction completed. Total length: %d characters from %d pages", 
                    len(full_text), len(reader.pages))
        return full_text
        
    except Exception as e:
        logging.error("PyPDF2 extraction failed: %s", e)
        raise RuntimeError(f"PDF extraction failed: {e}")

