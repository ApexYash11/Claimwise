import os 
import time 
import requests
import logging
from typing import Optional
from google import genai

# Environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable must be set")

# Base URL for Gemini Files API
GEMINI_API_BASE_URL = "https://api.gemini.com/files"

# Configuring logging
logging.basicConfig(level=logging.INFO)

# Initialize the client
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    logging.error("Failed to initialize Gemini client: %s", e)
    raise

def upload_pdf(file_path: str) -> str:
    """
    Uploads a PDF file to the Gemini Files API using the official library.

    Args:
        file_path (str): Path to the PDF file.

    Returns:
        str: File ID for the uploaded file.

    Raises:
        FileNotFoundError: If the file does not exist.
        Exception: If the upload fails.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    logging.info("Uploading PDF to Gemini Files API: %s", file_path)
    try:
        myfile = client.files.upload(file=file_path)
        file_id = myfile.name  # Extract the file ID
        logging.info("File uploaded successfully. File ID: %s", file_id)
        return file_id
    except Exception as e:
        logging.error("Failed to upload file: %s", e)
        raise

def poll_file_status(file_id: str, timeout: int = 300, interval: int = 5) -> str:
    """
    Polls the file status until it becomes ACTIVE

    Args:
        file_id (str): ID of the uploaded file
        timeout (int): Maximum time to wait in seconds
        interval (int): Time between polls in seconds

    Returns:
        str: Final status of the file.

    Raises:
        RuntimeError: If the file processing fails.
        TimeoutError: If polling times out.
    """
    logging.info("Polling file status for File ID: %s", file_id)
    url = f"{GEMINI_API_BASE_URL}/{file_id}"
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
        except requests.RequestException as e:
            logging.error("Error during polling: %s", e)
            time.sleep(interval)
            continue

        status = response.json().get("status")
        logging.info("Current status: %s", status)

        if status == "ACTIVE":
            logging.info("File is now ACTIVE")
            return status
        elif status in ["FAILED", "ERROR"]:
            raise RuntimeError(f"File processing failed with status: {status}")

        time.sleep(interval)

    raise TimeoutError("Polling timed out before file became ACTIVE")

def extract_text(file_reference: str) -> str:
    """
    Extracts normalized text from a file uploaded to Gemini Files API.

    Args:
        file_reference (str): Reference to the uploaded file.

    Returns:
        str: Extracted normalized text.

    Raises:
        Exception: If text extraction fails.
    """
    logging.info("Extracting text from file reference: %s", file_reference)
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=["Extract text from this file", file_reference]
        )
        logging.info("Text extraction successful. Length: %d characters", len(response.text))
        return response.text
    except Exception as e:
        logging.error("Failed to extract text: %s", e)
        raise

