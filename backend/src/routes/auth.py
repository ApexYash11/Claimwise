import os
import logging
import tempfile

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from src.auth import get_current_user, refresh_token

router = APIRouter()


@router.post("/refresh-token")
async def refresh(token: str = Form(...)):
    return await refresh_token(token)


@router.post("/test-gemini")
async def test_gemini(file: UploadFile, user_id: str = Depends(get_current_user)):
    temp_file_path = None
    try:
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=f"_{file.filename}"
        ) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        from src.gemini_files import upload_pdf, poll_file_status, extract_text

        file_id, file_uri = upload_pdf(temp_file_path)
        status = poll_file_status(file_id)
        if status != "ACTIVE":
            raise HTTPException(status_code=500, detail="File did not become ACTIVE")
        extracted_text = extract_text(temp_file_path)
        return {
            "file_id": file_id,
            "file_uri": file_uri,
            "status": status,
            "extracted_text": extracted_text,
        }
    except Exception as e:
        logging.exception("/test-gemini failed")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        except Exception:
            pass
