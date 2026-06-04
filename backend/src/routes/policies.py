import os
import logging
import tempfile
import time
import uuid
from datetime import datetime
from typing import Union, Dict, Any

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    HTTPException,
    Form,
    Depends,
    BackgroundTasks,
)
from supabase import create_client

from src.db import supabase, supabase_storage
from src.auth import get_current_user, oauth2_scheme
from src.models import UploadResponse
from src.document_validator import validate_insurance_document
from src.repositories.policy_repository import PolicyRepository
from src.services.activity_service import log_activity

router = APIRouter()
policy_repo = PolicyRepository()

STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "project")
APP_ENV = os.getenv("APP_ENV", os.getenv("ENVIRONMENT", "development")).lower()
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {"pdf"}
ALLOWED_UPLOAD_MIME_TYPES = {"application/pdf"}
ENABLE_DOCUMENT_VALIDATION = (
    os.getenv("ENABLE_DOCUMENT_VALIDATION", "true").lower() == "true"
)
SIGNED_URL_TTL_SECONDS = int(os.getenv("SIGNED_URL_TTL_SECONDS", "3600"))


def _duplicate_conflict_detail(error_obj: Any) -> str:
    default_message = "A resource already exists"
    constraint_name = None
    try:
        if error_obj is None:
            return default_message
        constraint_name = getattr(error_obj, "constraint_name", None)
        if not constraint_name:
            diag = getattr(error_obj, "diag", None)
            constraint_name = (
                getattr(diag, "constraint_name", None) if diag is not None else None
            )
        if not constraint_name:
            orig = getattr(error_obj, "orig", None)
            if orig is not None:
                diag = getattr(orig, "diag", None)
                constraint_name = (
                    getattr(diag, "constraint_name", None) if diag is not None else None
                )
    except Exception:
        constraint_name = None
    if constraint_name:
        return f"Conflict: duplicate value for constraint '{constraint_name}'"
    return default_message


@router.post("/upload-policy", response_model=UploadResponse)
async def upload_policy(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    policy_name: str = Form(None),
    policy_number: str = Form(None),
    file: UploadFile = File(None),
    text_input: str = Form(None),
    sync_indexing: bool = Form(False),
):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("upload", user_id, "/upload-policy")

    if file and text_input:
        raise HTTPException(
            status_code=400, detail="Provide either a file or text, not both."
        )
    elif not file and not text_input:
        raise HTTPException(status_code=400, detail="Provide a file or text.")

    extracted_text = None
    file_bytes = None
    if file:
        if not file.filename:
            raise HTTPException(
                status_code=400, detail="File must have a valid filename"
            )
        file_type = (
            file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        )
        if file_type not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        content_type = (file.content_type or "").lower().strip()
        if content_type not in ALLOWED_UPLOAD_MIME_TYPES:
            raise HTTPException(
                status_code=400, detail="Unsupported file content type."
            )
        declared_size = file.headers.get("content-length") if file.headers else None
        if (
            declared_size
            and declared_size.isdigit()
            and int(declared_size) > MAX_UPLOAD_BYTES
        ):
            raise HTTPException(
                status_code=413,
                detail=f"File is too large. Max allowed size is {MAX_UPLOAD_SIZE_MB}MB.",
            )
        file_bytes = await file.read()
        if len(file_bytes) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File is too large. Max allowed size is {MAX_UPLOAD_SIZE_MB}MB.",
            )
        temp_file_path = None
        try:
            with tempfile.NamedTemporaryFile(
                delete=False, suffix=f"_{file.filename}"
            ) as temp_file:
                temp_file.write(file_bytes)
                temp_file_path = temp_file.name
            try:
                from src.gemini_files import extract_text
            except Exception as import_err:
                logging.exception("Failed to import gemini_files: %s", import_err)
                raise HTTPException(
                    status_code=500,
                    detail="Server misconfiguration: PDF extraction module not available",
                )
            extracted_text = extract_text(temp_file_path)
            if not extracted_text:
                raise HTTPException(
                    status_code=400, detail="No text extracted from file."
                )
        finally:
            try:
                if temp_file_path and os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
            except Exception:
                pass
    else:
        extracted_text = text_input

    if ENABLE_DOCUMENT_VALIDATION and extracted_text:
        source_name = file.filename if file and file.filename else "text_input"
        validation_report = validate_insurance_document(extracted_text, source_name)
        if not validation_report.is_valid:
            raise HTTPException(
                status_code=400,
                detail="Uploaded content does not appear to be a valid insurance policy document.",
            )

    file_url = None
    if file and file_bytes:
        storage_path = f"policies/{user_id}/{file.filename}"
        try:
            try:
                supabase_storage.storage.from_(STORAGE_BUCKET).upload(
                    storage_path, file_bytes
                )
                file_url = storage_path
            except Exception as upload_error:
                error_str = str(upload_error)
                if "Duplicate" in error_str or "already exists" in error_str:
                    timestamp = str(int(time.time()))
                    if file.filename:
                        filename_parts = file.filename.rsplit(".", 1)
                        unique_filename = (
                            f"{filename_parts[0]}_{timestamp}.{filename_parts[1]}"
                            if len(filename_parts) == 2
                            else f"{file.filename}_{timestamp}"
                        )
                    else:
                        unique_filename = f"uploaded_file_{timestamp}"
                    storage_path = f"policies/{user_id}/{unique_filename}"
                    supabase_storage.storage.from_(STORAGE_BUCKET).upload(
                        storage_path, file_bytes
                    )
                    file_url = storage_path
                else:
                    raise upload_error
        except Exception as storage_error:
            logging.exception("Storage Error: %s", storage_error)
            raise HTTPException(status_code=500, detail="File storage failed.")

    data = {
        "user_id": user_id,
        "policy_name": policy_name,
        "policy_number": policy_number,
        "extracted_text": extracted_text,
        "uploaded_file_url": file_url,
    }
    try:
        svc = supabase_storage or supabase
        try:
            user_check = svc.table("users").select("id").eq("id", user_id).execute()
            if not (user_check and getattr(user_check, "data", None)):
                raise HTTPException(
                    status_code=403,
                    detail="User profile not found. Please re-authenticate.",
                )
        except HTTPException:
            raise
        except Exception:
            logging.warning(
                "Could not verify user existence prior to insert; continuing"
            )

        response = svc.table("policies").insert(data).execute()
        resp_err = getattr(response, "error", None)
        if resp_err:
            logging.error("Supabase insert error: %s", resp_err)
            err_msg = getattr(resp_err, "message", str(resp_err))
            err_code = getattr(resp_err, "code", "")
            if "foreign key" in str(err_msg).lower() or err_code == "23503":
                raise HTTPException(
                    status_code=403,
                    detail="Invalid user or authentication state. Please re-authenticate.",
                )
            if (
                err_code == "23505"
                or "duplicate key" in str(err_msg).lower()
                or "already exists" in str(err_msg).lower()
            ):
                raise HTTPException(
                    status_code=409, detail=_duplicate_conflict_detail(resp_err)
                )
            raise HTTPException(status_code=500, detail="Failed to save policy.")

        if not (response and getattr(response, "data", None)):
            raise HTTPException(status_code=500, detail="Failed to save policy.")

        policy_id = response.data[0]["id"]

        if sync_indexing:
            try:
                from src.rag import index_documents

                await index_documents(extracted_text, policy_id)
            except Exception as e:
                logging.exception("Synchronous indexing failed: %s", e)
        else:
            try:
                from src.rag import index_documents

                background_tasks.add_task(index_documents, extracted_text, policy_id)
            except Exception as e:
                logging.exception("Failed to schedule background indexing: %s", e)

        log_activity(
            user_id=user_id,
            activity_type="upload",
            title=f"Uploaded {policy_name or 'Policy'}",
            description=f"{policy_name or 'Policy document'} successfully uploaded and processed",
            details={
                "policy_id": policy_id,
                "file_type": "file" if file else "text",
                "file_name": file.filename if file else None,
                "text_length": len(extracted_text),
            },
        )

        return UploadResponse(
            policy_id=policy_id,
            extracted_text=extracted_text,
            status="indexing_started",
            indexing_mode="synchronous" if sync_indexing else "background",
        )
    except HTTPException:
        raise
    except Exception as db_error:
        logging.exception("Database save error: %s", db_error)
        err_str = str(db_error).lower()
        if (
            "foreign key" in err_str
            or "violates foreign key" in err_str
            or "23503" in err_str
        ):
            raise HTTPException(
                status_code=403,
                detail="Invalid user or authentication state. Please re-authenticate.",
            )
        if (
            "23505" in err_str
            or "duplicate key" in err_str
            or "already exists" in err_str
        ):
            raise HTTPException(
                status_code=409, detail=_duplicate_conflict_detail(db_error)
            )
        raise HTTPException(status_code=500, detail="Database save failed.")


@router.get("/policies")
def get_user_policies(user_id: str = Depends(get_current_user)):
    try:
        policies = (
            supabase.table("policies")
            .select(
                "id, policy_name, policy_number, created_at, validation_score, validation_metadata, uploaded_file_url"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        data = policies.data if policies.data else []
        return {"policies": data, "total": len(data), "success": True}
    except Exception as e:
        logging.exception("Error fetching policies for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Error fetching policies.")


@router.get("/policies/{policy_id}/file-url")
def get_policy_file_url(policy_id: str, user_id: str = Depends(get_current_user)):
    from src.main_app import _enforce_user_rate_limit

    _enforce_user_rate_limit("user_general", user_id, "/policies/file-url")
    policy_res = (
        supabase.table("policies")
        .select("uploaded_file_url")
        .eq("id", policy_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not policy_res or not getattr(policy_res, "data", None):
        raise HTTPException(status_code=404, detail="Policy not found.")
    file_path = policy_res.data[0].get("uploaded_file_url")
    if not file_path:
        raise HTTPException(
            status_code=404, detail="No file available for this policy."
        )
    signed_result = supabase_storage.storage.from_(STORAGE_BUCKET).create_signed_url(
        file_path, SIGNED_URL_TTL_SECONDS
    )
    signed_url = None
    if isinstance(signed_result, dict):
        signed_url = signed_result.get("signedURL") or signed_result.get("signedUrl")
    elif hasattr(signed_result, "get"):
        signed_url = signed_result.get("signedURL") or signed_result.get("signedUrl")
    if not signed_url:
        raise HTTPException(status_code=500, detail="Could not create signed URL.")
    return {
        "policy_id": policy_id,
        "signed_url": signed_url,
        "expires_in": SIGNED_URL_TTL_SECONDS,
    }


@router.delete("/policies/{policy_id}")
def delete_policy(
    policy_id: str,
    user_id: str = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
):
    try:
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        auth_client = create_client(url, key)
        auth_client.postgrest.auth(token)
        policy = (
            auth_client.table("policies")
            .select("id", "uploaded_file_url")
            .eq("id", policy_id)
            .execute()
            .data
        )
        if not policy:
            raise HTTPException(
                status_code=404, detail="Policy not found or access denied."
            )
        policy_repo.delete(policy_id, auth_client)
        log_activity(
            user_id=user_id,
            activity_type="delete",
            title="Policy Deleted",
            description=f"Policy {policy_id} deleted",
            details={"policy_id": policy_id},
        )
        return {"message": "Policy deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error deleting policy: %s", e)
        raise HTTPException(status_code=500, detail="Error deleting policy.")
