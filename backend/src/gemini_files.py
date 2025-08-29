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


def upload_pdf(file_path: str) -> Tuple[str, Optional[str]]:
    """
    Uploads a PDF file to the Gemini Files API using the official library.

    Args:
        file_path (str): Path to the PDF file.

    Returns:
        Tuple[str, Optional[str]]: (file_id, file_uri)
            - file_id: e.g. "files/hb000h035qxm"
            - file_uri: full file resource URI if available (may require auth to download)

    Raises:
        FileNotFoundError: If the file does not exist.
        Exception: If the upload fails.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    logging.info("Uploading PDF to Gemini Files API: %s", file_path)

    # If the Gemini client isn't configured, fall back to local-only mode.
    if client is None:
        logging.info("Gemini client not configured; skipping remote upload and returning local sentinel")
        # Return a sentinel file_id so callers can continue and prefer local extraction
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
    Polls the file status using the SDK until it becomes ACTIVE.

    Args:
        file_id (str): ID of the uploaded file (e.g. "files/hb..." or the name returned by upload)
        timeout (int): Maximum time to wait in seconds
        interval (int): Time between polls in seconds

    Returns:
        str: Final status of the file.

    Raises:
        RuntimeError: If the file processing fails.
        TimeoutError: If polling times out.
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


def extract_text(file_reference: str) -> str:
    """
    Extracts normalized text from a local PDF file or a Gemini Files reference.
    Extract text strictly from a local PDF using PyPDF2.
    This function intentionally does NOT call the Gemini model for extraction to
    keep extraction deterministic and local.
    """
    logging.info("Extracting text from local file: %s", file_reference)
    if not os.path.exists(file_reference):
        raise FileNotFoundError(f"File not found: {file_reference}")

    if PdfReader is None:
        logging.error("PyPDF2 is not installed; cannot perform local extraction. Please install PyPDF2.")
        raise RuntimeError("PyPDF2 not available for local PDF extraction")

    reader = PdfReader(file_reference)
    texts = []
    for page in reader.pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            texts.append("")
    full_text = "\n".join(texts)
    logging.info("Local PDF extraction completed. Length: %d characters", len(full_text))
    return full_text

