import os
import logging
import tempfile
import traceback

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from src.db import supabase, supabase_storage
from src.auth import get_current_user
from src.main_app import _require_debug_routes_enabled, _require_admin_user

router = APIRouter()


@router.get("/debug/user-policies")
def debug_user_policies(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        policies = (
            supabase.table("policies")
            .select("id", "policy_name", "user_id", "created_at")
            .eq("user_id", user_id)
            .execute()
            .data
        )
        return {
            "user_id": user_id,
            "policy_count": len(policies),
            "policies": policies[:5],
        }
    except Exception as e:
        logging.exception("debug_user_policies failed: %s", e)
        raise HTTPException(status_code=500, detail="Debug endpoint failed.")


@router.get("/debug/gemini-config")
def debug_gemini_config(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        from src.llm import make_llm_request

        api_key = os.getenv("GEMINI_API_KEY")
        key_status = {
            "has_api_key": bool(api_key),
            "key_length": len(api_key) if api_key else 0,
            "key_prefix": api_key[:8] + "..." if api_key and len(api_key) > 8 else None,
        }
        test_prompt = "Respond with exactly: 'Gemini Pro API working correctly'"
        response = make_llm_request(test_prompt)
        response_str = str(response) if response is not None else ""
        return {
            "status": "success",
            "model": "gemini-3-flash",
            "api_key_status": key_status,
            "test_response": response_str[:100] + "..."
            if len(response_str) > 100
            else response_str,
            "response_length": len(response_str),
            "message": "Gemini Pro API is working correctly with your student account!",
        }
    except Exception as e:
        logging.exception("debug_gemini_config failed: %s", e)
        error_str = str(e)
        return {
            "status": "error",
            "error": "Gemini API diagnostic check failed",
            "is_quota_error": "429" in error_str or "quota" in error_str.lower(),
            "is_auth_error": "401" in error_str or "unauthorized" in error_str.lower(),
            "is_model_error": "model" in error_str.lower(),
            "suggestions": [
                "Verify your GEMINI_API_KEY environment variable is set correctly",
                "Check if your student account has access to gemini-1.5-pro model",
                "Try switching to gemini-1.5-flash if pro access is limited",
                "Ensure your API key hasn't expired",
            ],
        }


@router.get("/debug/api-status")
def debug_api_status(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        from src.llm_groq import get_api_status

        return get_api_status()
    except Exception as e:
        logging.exception("debug_api_status failed: %s", e)
        return {
            "status": "error",
            "error": "Failed to check API status",
            "message": "Failed to check API status",
        }


@router.get("/debug/policies")
def debug_list_policies(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        policies = (
            supabase.table("policies")
            .select("id, policy_name, policy_number, created_at, extracted_text")
            .eq("user_id", user_id)
            .execute()
            .data
        )
        return {
            "total_policies": len(policies),
            "policies": [
                {
                    "id": policy["id"],
                    "current_name": policy.get("policy_name"),
                    "policy_number": policy.get("policy_number"),
                    "created_at": policy.get("created_at"),
                    "text_length": len(policy.get("extracted_text", "")),
                    "is_test_data": "test insurance policy"
                    in (policy.get("extracted_text", "")).lower(),
                }
                for policy in policies
            ],
        }
    except Exception as e:
        logging.exception("debug_list_policies failed: %s", e)
        raise HTTPException(status_code=500, detail="Error fetching policies.")


@router.post("/debug/update-policy-name/{policy_id}")
def debug_update_policy_name(
    policy_id: str, new_name: str, user_id: str = Depends(get_current_user)
):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        result = (
            supabase.table("policies")
            .select("id, policy_name")
            .eq("id", policy_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found")
        old_name = result.data[0].get("policy_name")
        supabase.table("policies").update({"policy_name": new_name}).eq(
            "id", policy_id
        ).eq("user_id", user_id).execute()
        return {
            "message": "Policy name updated successfully",
            "policy_id": policy_id,
            "old_name": old_name,
            "new_name": new_name,
        }
    except Exception as e:
        logging.exception("debug_update_policy_name failed: %s", e)
        raise HTTPException(status_code=500, detail="Error updating policy name.")


@router.get("/debug/policy-content/{policy_id}")
def debug_policy_content(policy_id: str, user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        result = (
            supabase.table("policies")
            .select("*")
            .eq("id", policy_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found")
        policy = result.data[0]
        extracted_text = policy.get("extracted_text", "")
        text_length = len(extracted_text)
        is_test_data = (
            "test insurance policy for automated testing" in extracted_text.lower()
        )
        has_sufficient_content = text_length > 200 and not is_test_data
        return {
            "policy_id": policy_id,
            "policy_name": policy.get("policy_name"),
            "text_length": text_length,
            "is_test_data": is_test_data,
            "has_sufficient_content": has_sufficient_content,
            "text_preview": extracted_text[:200] + ("..." if text_length > 200 else ""),
            "recommendations": [
                "Upload actual policy documents instead of test files"
                if is_test_data
                else None,
                "Ensure extraction extracted the document properly"
                if text_length < 100
                else None,
                "Policy content looks good for chat"
                if has_sufficient_content
                else None,
            ],
        }
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found")
    except Exception as e:
        logging.exception("debug_policy_content failed: %s", e)
        raise HTTPException(status_code=500, detail="Debug endpoint failed.")


@router.post("/create-test-comparison")
def create_test_comparison(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        policies = (
            supabase.table("policies")
            .select("id")
            .eq("user_id", user_id)
            .limit(2)
            .execute()
            .data
        )
        if len(policies) >= 2:
            result = (
                supabase.table("comparisons")
                .insert(
                    {
                        "user_id": user_id,
                        "policy_1_id": policies[0]["id"],
                        "policy_2_id": policies[1]["id"],
                        "comparison_result": "Test comparison created for dashboard testing",
                    }
                )
                .execute()
            )
            return {
                "success": True,
                "message": "Test comparison created",
                "comparison_id": result.data[0].get("id") if result.data else None,
            }
        else:
            result = (
                supabase.table("comparisons")
                .insert(
                    {
                        "user_id": user_id,
                        "policy_1_id": "test_policy_1",
                        "policy_2_id": "test_policy_2",
                        "comparison_result": "Test comparison created for dashboard testing",
                    }
                )
                .execute()
            )
            return {
                "success": True,
                "message": "Test comparison created with placeholder IDs",
                "comparison_id": result.data[0].get("id") if result.data else None,
            }
    except Exception as e:
        logging.exception("Error creating test comparison: %s", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error creating test comparison.")


@router.get("/test-comparisons-table")
def test_comparisons_table(user_id: str = Depends(get_current_user)):
    try:
        _require_debug_routes_enabled()
        _require_admin_user(user_id)
        result = supabase.table("comparisons").select("*").limit(10).execute()
        return {
            "success": True,
            "total_comparisons": len(result.data) if result.data else 0,
            "sample_data": result.data[:5] if result.data else [],
        }
    except Exception as e:
        logging.exception("Error querying comparisons table: %s", e)
        traceback.print_exc()
        return {
            "success": False,
            "error": "Query failed",
            "message": "Comparisons table might not exist or has permission issues",
        }
