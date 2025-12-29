from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from dotenv import load_dotenv
import os
# Load environment variables early so db.py can use them on import
load_dotenv()
STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "proeject")
from src.db import supabase, supabase_storage
from src.llm_groq import analyze_policy, compare_policies, chat_with_policy, chat_with_multiple_policies, get_api_status
from src.auth import get_current_user, refresh_token, oauth2_scheme
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime
import tempfile
import logging
from supabase import create_client

from src.models import UploadResponse, ChatRequest, ChatResponse, PolicyAnalysisResponse, ComparisonResponse
from typing import Union, Dict
from fastapi import BackgroundTasks


def log_activity(user_id: str, activity_type: str, title: str, description: str, details: Union[Dict, None] = None):
    """
    Log user activity to the database for dynamic activity tracking.
    """
    try:
        activity_data = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "type": activity_type,
            "title": title,
            "description": description,
            "details": details or {},
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
        }
        
        result = supabase.table("activities").insert(activity_data).execute()
        logging.debug("Activity logged: %s - %s", activity_type, title)
        return result.data[0] if result.data else None
    except Exception as e:
        logging.exception("Error logging activity: %s", e)
        return None

app = FastAPI()

# Basic logging configuration (adjust level in production via environment or hosting platform)
logging.basicConfig(level=logging.INFO)

# CORS middleware to allow cross-origin requests
origins = [
    "https://claimwise-fht9.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "ClaimWise Backend"}


@app.get("/healthz")
def healthz():
    """Simple health endpoint for load balancers and platform health checks."""
    return {"status": "ok"}

@app.post("/upload-policy", response_model=UploadResponse)
async def upload_policy(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
    policy_name: str = Form(None),
    policy_number: str = Form(None),
    file: UploadFile = File(None),
    text_input: str = Form(None),
    sync_indexing: bool = Form(False),  # Dev-mode option for immediate indexing
):
    """
    Upload a policy file or text, extract/process text, and store in Supabase.
    
    Args:
        user_id (str): ID of the authenticated user.
        policy_name (str): Name of the policy.
        policy_number (str, optional): Policy number (if available).
        file (UploadFile, optional): Uploaded file (PDF or image).
        text_input (str, optional): Pasted policy text.
    
    Returns:
        dict: Policy ID and processed text.
    """
    logging.debug("file=%s, policy_name=%s, policy_number=%s, text_input=%s", file, policy_name, policy_number, text_input)
    if file:
        logging.debug("file.filename=%s, file.content_type=%s", file.filename, file.content_type)
    try:
        if file and text_input:
            raise HTTPException(status_code=400, detail="Provide either a file or text, not both.")
        elif not file and not text_input:
            raise HTTPException(status_code=400, detail="Provide a file or text.")

        extracted_text = None
        file_bytes = None
        if file:
            logging.debug("Reading file bytes...")
            file_bytes = await file.read()
            logging.debug("Read %d bytes from file", len(file_bytes))
            if not file.filename:
                raise HTTPException(status_code=400, detail="File must have a valid filename")
            file_type = file.filename.split('.')[-1].lower()
            logging.debug("Processing %s file via Gemini Files API...", file_type)

            # Save to a temporary file so the Gemini SDK can upload it
            temp_file_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
                    temp_file.write(file_bytes)
                    temp_file_path = temp_file.name

                # Extract text locally using PyPDF2 ONLY (no API usage for extraction)
                try:
                    from src.gemini_files import extract_text
                except Exception as import_err:
                    logging.exception("Failed to import gemini_files: %s", import_err)
                    raise HTTPException(status_code=500, detail="Server misconfiguration: PDF extraction module not available")

                # Always use local file for extraction - NO API calls
                extracted_text = extract_text(temp_file_path)
                logging.debug("Local PDF extraction completed. Text length: %d", len(extracted_text) if extracted_text else 0)
                logging.debug("Extracted text length: %d", len(extracted_text) if extracted_text else 0)

                if not extracted_text:
                    raise HTTPException(status_code=400, detail="No text extracted from file.")

            finally:
                # Ensure temporary file is cleaned up
                try:
                    if temp_file_path and os.path.exists(temp_file_path):
                        os.unlink(temp_file_path)
                except Exception:
                    pass
        else:
            extracted_text = text_input

        # Upload to Supabase storage (if we have a file)
        logging.debug("Uploading to Supabase storage...")
        file_url = None
        if file and file_bytes:
            storage_path = f"policies/{user_id}/{file.filename}"
            try:
                # Try to upload, if duplicate exists, generate unique name
                try:
                    supabase_storage.storage.from_(STORAGE_BUCKET).upload(storage_path, file_bytes)
                    file_url = supabase_storage.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
                    logging.debug("File uploaded to: %s", file_url)
                except Exception as upload_error:
                    error_str = str(upload_error)
                    if "Duplicate" in error_str or "already exists" in error_str:
                        # Generate unique filename with timestamp
                        import time
                        timestamp = str(int(time.time()))
                        if file.filename:
                            filename_parts = file.filename.rsplit('.', 1)
                            if len(filename_parts) == 2:
                                unique_filename = f"{filename_parts[0]}_{timestamp}.{filename_parts[1]}"
                            else:
                                unique_filename = f"{file.filename}_{timestamp}"
                        else:
                            unique_filename = f"uploaded_file_{timestamp}"

                        storage_path = f"policies/{user_id}/{unique_filename}"
                        logging.debug("File exists, trying with unique name: %s", unique_filename)
                        supabase_storage.storage.from_(STORAGE_BUCKET).upload(storage_path, file_bytes)
                        file_url = supabase_storage.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
                        logging.debug("File uploaded with unique name to: %s", file_url)
                    else:
                        raise upload_error
            except Exception as storage_error:
                logging.exception("Storage Error: %s", storage_error)
                raise HTTPException(status_code=500, detail=f"File storage failed: {str(storage_error)}")

        logging.debug("Saving to database...")
        data = {
            "user_id": user_id,
            "policy_name": policy_name,
            "policy_number": policy_number,
            "extracted_text": extracted_text,
            "uploaded_file_url": file_url
        }
        try:
            # Use service-role client for writes if available
            svc = supabase_storage or supabase
            response = svc.table("policies").insert(data).execute()
            if not (response and getattr(response, "data", None)):
                raise HTTPException(status_code=500, detail="Failed to save policy.")

            policy_id = response.data[0]['id']

            # Choose indexing mode based on sync_indexing parameter
            indexing_mode = "synchronous" if sync_indexing else "background"
            
            if sync_indexing:
                # Synchronous indexing for dev-mode (immediate feedback)
                try:
                    from src.rag import index_documents
                    indexed_chunks = index_documents(extracted_text, policy_id)
                    logging.info("Synchronous indexing completed: %d chunks indexed", len(indexed_chunks))
                except Exception as e:
                    logging.exception("Synchronous indexing failed: %s", e)
            else:
                # schedule indexing in background (non-blocking)
                try:
                    from src.rag import index_documents
                    background_tasks.add_task(index_documents, extracted_text, policy_id)
                except Exception as e:
                    logging.exception("Failed to schedule background indexing: %s", e)

            # Log activity
            log_activity(
                user_id=user_id,
                activity_type="upload",
                title=f"Uploaded {policy_name or 'Policy'}",
                description=f"{policy_name or 'Policy document'} successfully uploaded and processed",
                details={
                    "policy_id": policy_id,
                    "file_type": "file" if file else "text",
                    "file_name": file.filename if file else None,
                    "text_length": len(extracted_text)
                }
            )

            return UploadResponse(
                policy_id=policy_id, 
                extracted_text=extracted_text, 
                status="indexing_started",
                indexing_mode=indexing_mode
            )
        except Exception as db_error:
            raise HTTPException(status_code=500, detail=f"Database save failed: {str(db_error)}")
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Unexpected Error while processing upload_policy: %s", e)
        raise HTTPException(status_code=500, detail=f"Error processing input: {str(e)}")

from fastapi import Form

@app.get("/debug/user-policies")
def debug_user_policies(user_id: str = Depends(get_current_user)):
    """Debug endpoint to check user's policies"""
    try:
        policies = supabase.table("policies").select("id", "policy_name", "user_id", "created_at").eq("user_id", user_id).execute().data
        return {
            "user_id": user_id,
            "policy_count": len(policies),
            "policies": policies[:5]  # Show first 5
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze-policy")
def analyze(policy_id: str = Form(...), user_id: str = Depends(get_current_user)):
    """
    Analyze a policy using LLM based on its extracted text.
    
    Args:
        policy_id (str): ID of the policy to analyze.
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: LLM analysis result.
    """
    try:
        result = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_id).eq("user_id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found for this user.")
        
        policy = result.data[0]
        analysis = analyze_policy(policy['extracted_text'])
        
        # Update policy with analysis result in validation_metadata
        metadata = policy.get('validation_metadata') or {}
        if not isinstance(metadata, dict):
            metadata = {}
        metadata['analysis_result'] = analysis
        
        supabase.table("policies").update({"validation_metadata": metadata}).eq("id", policy_id).execute()
        
        # Log the analysis activity
        log_activity(
            user_id=user_id,
            activity_type="analysis", 
            title="Policy Analysis Completed",
            description=f"{policy.get('policy_name', 'Policy')} analyzed successfully",
            details={
                "policy_id": policy_id,
                "policy_type": analysis.get('policy_type', 'Unknown'),
                "provider": analysis.get('provider', 'Unknown'),
                "analysis_score": analysis.get('claim_readiness_score', 0)
            }
        )
        
        return {"analysis": analysis}
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found for this user.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing policy: {str(e)}")

@app.delete("/policies/{policy_id}")
def delete_policy(
    policy_id: str, 
    user_id: str = Depends(get_current_user),
    token: str = Depends(oauth2_scheme)
):
    """
    Delete a policy and its associated data.
    """
    logging.info(f"Attempting to delete policy: {policy_id} for user: {user_id}")
    try:
        # Create a new client authenticated with the user's token to respect RLS
        # This is safer than using the service role and works even if service role is missing
        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_KEY", "")
        auth_client = create_client(url, key)
        auth_client.postgrest.auth(token)
        
        # Verify policy ownership (and existence)
        # Using auth_client ensures we only see policies the user is allowed to see
        policy = auth_client.table("policies").select("id", "uploaded_file_url").eq("id", policy_id).execute().data
        
        if not policy:
            logging.warning(f"Policy {policy_id} not found for user {user_id}")
            raise HTTPException(status_code=404, detail="Policy not found or access denied.")
        
        # Delete associated document chunks first (to avoid foreign key issues)
        try:
            auth_client.table("document_chunks").delete().eq("policy_id", policy_id).execute()
            logging.info(f"Deleted document chunks for policy: {policy_id}")
        except Exception as e:
            logging.warning(f"Could not delete document chunks for policy {policy_id}: {e}")
            # Continue anyway, as the policy delete might still work if there's a cascade or no FK
            
        # Delete from database
        auth_client.table("policies").delete().eq("id", policy_id).execute()
        
        # Log activity (using service role or global client is fine for logging)
        log_activity(
            user_id=user_id,
            activity_type="delete",
            title="Policy Deleted",
            description=f"Policy {policy_id} deleted",
            details={"policy_id": policy_id}
        )
        
        return {"message": "Policy deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logging.exception(f"Error deleting policy: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting policy: {str(e)}")

@app.post("/compare-policies")
def compare(policy_1_id: str, policy_2_id: str, user_id: str = Depends(get_current_user)):
    """
    Compare two policies using LLM and store the result.
    
    Args:
        policy_1_id (str): ID of the first policy.
        policy_2_id (str): ID of the second policy.
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: Comparison result.
    """
    try:
        logging.debug("Starting comparison for user %s, policies %s vs %s", user_id, policy_1_id, policy_2_id)

        res1 = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_1_id).eq("user_id", user_id).execute()
        res2 = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_2_id).eq("user_id", user_id).execute()

        if not res1.data or not res2.data:
            raise HTTPException(status_code=404, detail="One or both policies not found for this user.")

        pol1 = res1.data[0]
        pol2 = res2.data[0]

        logging.debug("Retrieved policies successfully")

        comparison_result_text = compare_policies(pol1['extracted_text'], pol2['extracted_text'], pol1.get('policy_number'), pol2.get('policy_number'))
        logging.debug("LLM comparison completed, storing result...")

        # Store comparison result
        comparison_data = {
            "user_id": user_id,
            "policy_1_id": policy_1_id,
            "policy_2_id": policy_2_id,
            "comparison_result": comparison_result_text
        }

        result = supabase.table("comparisons").insert(comparison_data).execute()
        logging.debug("Comparison stored successfully: %s", result)

        # Log comparison activity
        log_activity(
            user_id=user_id,
            activity_type="comparison",
            title="Policy Comparison Completed",
            description=f"Compared {pol1.get('policy_name', 'Policy 1')} vs {pol2.get('policy_name', 'Policy 2')}",
            details={
                "policy_1_id": policy_1_id,
                "policy_2_id": policy_2_id,
                "policy_1_name": pol1.get('policy_name', 'Policy 1'),
                "policy_2_name": pol2.get('policy_name', 'Policy 2')
            }
        )

        if result.data:
            comparison_id = result.data[0].get('id', 'unknown')
            logging.debug("Comparison record created with ID: %s", comparison_id)
        else:
            logging.warning("Warning - comparison insert returned no data")

        return {"comparison": comparison_result_text, "comparison_id": result.data[0].get('id') if result.data else None}

    except IndexError:
        logging.debug("Policy not found - policy_1_id: %s, policy_2_id: %s, user_id: %s", policy_1_id, policy_2_id, user_id)
        raise HTTPException(status_code=404, detail="One or both policies not found for this user.")
    except Exception as e:
        logging.exception("Error in compare-policies: %s", str(e))
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error comparing policies: {str(e)}")

@app.get("/debug/gemini-config")
def debug_gemini_config():
    """
    Check Gemini API configuration and model access.
    """
    try:
        from src.llm import make_llm_request
        import os
        
        # Get API key status (don't expose the actual key)
        api_key = os.getenv("GEMINI_API_KEY")
        key_status = {
            "has_api_key": bool(api_key),
            "key_length": len(api_key) if api_key else 0,
            "key_prefix": api_key[:8] + "..." if api_key and len(api_key) > 8 else None
        }
        
        # Test with a simple prompt
        test_prompt = "Respond with exactly: 'Gemini Pro API working correctly'"
        response = make_llm_request(test_prompt)
        
        # Ensure response is a string before slicing
        response_text = str(response) if response is not None else ""
        
        return {
            "status": "success",
            "model": "gemini-1.5-pro",
            "api_key_status": key_status,
            "test_response": response_text[:100] + "..." if len(response_text) > 100 else response_text,
            "response_length": len(response_text),
            "message": "Gemini Pro API is working correctly with your student account!"
        }
        
    except Exception as e:
        error_str = str(e)
        
        return {
            "status": "error",
            "error": error_str,
            "is_quota_error": "429" in error_str or "quota" in error_str.lower(),
            "is_auth_error": "401" in error_str or "unauthorized" in error_str.lower(),
            "is_model_error": "model" in error_str.lower(),
            "suggestions": [
                "Verify your GEMINI_API_KEY environment variable is set correctly",
                "Check if your student account has access to gemini-1.5-pro model",
                "Try switching to gemini-1.5-flash if pro access is limited",
                "Ensure your API key hasn't expired"
            ]
        }

@app.get("/debug/api-status")
def debug_api_status():
    """
    Check API status for both Groq and Gemini.
    """
    try:
        from src.llm_groq import get_api_status
        return get_api_status()
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to check API status"
        }

@app.get("/debug/policies")
def debug_list_policies(user_id: str = Depends(get_current_user)):
    """
    List all policies with their current names for debugging.
    """
    try:
        policies = supabase.table("policies").select("id, policy_name, policy_number, created_at, extracted_text").eq("user_id", user_id).execute().data
        
        return {
            "total_policies": len(policies),
            "policies": [
                {
                    "id": policy["id"],
                    "current_name": policy.get("policy_name"),
                    "policy_number": policy.get("policy_number"),
                    "created_at": policy.get("created_at"),
                    "text_length": len(policy.get("extracted_text", "")),
                    "is_test_data": "test insurance policy" in (policy.get("extracted_text", "")).lower()
                }
                for policy in policies
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching policies: {str(e)}")

@app.post("/debug/update-policy-name/{policy_id}")
def debug_update_policy_name(policy_id: str, new_name: str, user_id: str = Depends(get_current_user)):
    """
    Update a specific policy name for debugging.
    """
    try:
        # Verify the policy belongs to the user
        result = supabase.table("policies").select("id, policy_name").eq("id", policy_id).eq("user_id", user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        old_name = result.data[0].get("policy_name")
        
        # Update the policy name
        result = supabase.table("policies").update({
            "policy_name": new_name
        }).eq("id", policy_id).eq("user_id", user_id).execute()
        
        return {
            "message": f"Policy name updated successfully",
            "policy_id": policy_id,
            "old_name": old_name,
            "new_name": new_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating policy name: {str(e)}")

@app.get("/debug/policy-content/{policy_id}")
def debug_policy_content(policy_id: str, user_id: str = Depends(get_current_user)):
    """
    Debug endpoint to check policy content for chat troubleshooting.
    """
    try:
        result = supabase.table("policies").select("*").eq("id", policy_id).eq("user_id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found")
            
        policy = result.data[0]
        
        extracted_text = policy.get('extracted_text', '')
        text_length = len(extracted_text)
        
        # Check if it's test data
        is_test_data = "test insurance policy for automated testing" in extracted_text.lower()
        
        # Check if text is substantial enough for chat
        has_sufficient_content = text_length > 200 and not is_test_data
        
        return {
            "policy_id": policy_id,
            "policy_name": policy.get('policy_name'),
            "text_length": text_length,
            "is_test_data": is_test_data,
            "has_sufficient_content": has_sufficient_content,
            "text_preview": extracted_text[:200] + ("..." if text_length > 200 else ""),
            "recommendations": [
                "Upload actual policy documents instead of test files" if is_test_data else None,
                "Ensure extraction extracted the document properly" if text_length < 100 else None,
                "Policy content looks good for chat" if has_sufficient_content else None
            ]
        }
        
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, user_id: str = Depends(get_current_user)):
    """
    Answer a question based on a specific policy text.
    
    Args:
        policy_id (str): ID of the policy to query.
        question (str): User’s question.
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: Chat response.
    """
    try:
        policy_id = request.policy_id
        question = request.question
        
        result = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_id).eq("user_id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Policy not found for this user.")
            
        policy = result.data[0]
        
        extracted_text = policy.get('extracted_text', '')

        # If little or no extracted text, short-circuit
        if not extracted_text or len(extracted_text) < 50:
            return ChatResponse(answer="This policy appears to have no extracted text. Please try re-uploading the policy document.", citations=[])

        # Use retrieve_top_k from rag to get context chunks (RAG)
        try:
            from src.rag import retrieve_top_k
        except Exception as e:
            logging.exception("Failed to import rag.retrieve_top_k: %s", e)
            return ChatResponse(answer="Server misconfiguration: retrieval not available", citations=[])

        # Retrieve top chunks for the question
        top = []
        try:
            top = retrieve_top_k(question, k=5)
        except Exception as e:
            logging.exception("retrieve_top_k failed: %s", e)

        # Build prompt with retrieved chunks as context with simple citations
        prompt_parts = []
        citations = []
        for idx, content, score in top:
            # idx is chunk id in DB; include short excerpt as citation
            excerpt = (content[:400] + '...') if content and len(content) > 400 else (content or '')
            prompt_parts.append(excerpt)
            citations.append({"id": idx, "excerpt": excerpt, "score": score})

        # If no retrieval results, fall back to using full extracted_text (but keep short)
        if not prompt_parts:
            context_str = extracted_text[:2000]
        else:
            context_str = "\n\n".join(prompt_parts)

        final_prompt = f"You are an insurance expert. Use the provided context to answer the question. Context:\n{context_str}\n\nQuestion: {question}\n\nAnswer succinctly and cite chunks by id when referenced."

        # Call optimized LLM (prefers Groq, falls back to Gemini) if available
        try:
            from src.llm import make_llm_request
            resp = make_llm_request(final_prompt)
            if resp is None:
                raise ValueError("LLM returned None")
            answer = getattr(resp, 'text', str(resp))
        except Exception as e:
            logging.exception("Gemini generation failed, using fallback chat_with_policy: %s", e)
            try:
                from src.llm_groq import chat_with_policy as fallback_chat
                answer = fallback_chat(extracted_text, question, policy.get('policy_number'))
            except Exception as e2:
                logging.exception("Fallback chat failed: %s", e2)
                answer = "Service temporarily unavailable. Please try again later."

        # Log chat activity
        log_activity(
            user_id=user_id,
            activity_type="chat",
            title=f"Asked about {policy.get('policy_name', 'Policy')}",
            description=f"AI assistant answered question about policy coverage",
            details={
                "policy_id": policy_id,
                "question": question[:100] + "..." if len(question) > 100 else question,
                "chat_type": "single_policy"
            }
        )

        # Log successful chat
        supabase.table("chat_logs").insert({
            "user_id": user_id,
            "policy_id": policy_id,
            "question": question,
            "answer": answer
        }).execute()

        return ChatResponse(answer=answer, citations=citations)
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found for this user.")
    except Exception as e:
        logging.exception("Chat error for policy %s: %s", getattr(request, 'policy_id', 'unknown'), str(e))
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.post("/chat-multiple")
def chat_multiple_policies(question: str, user_id: str = Depends(get_current_user)):
    """
    Answer a question based on all user's policies.
    
    Args:
        question (str): User's question.
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: Chat response from multiple policies.
    """
    try:
        # Get all policies for the user
        policies = supabase.table("policies").select("id", "extracted_text", "policy_number").eq("user_id", user_id).execute().data
        
        if not policies:
            raise HTTPException(status_code=404, detail="No policies found for this user.")
        
        # Prepare policies data for the LLM
        policies_data = []
        for policy in policies:
            policies_data.append({
                'id': policy['id'],
                'extracted_text': policy['extracted_text'],
                'policy_number': policy.get('policy_number', f"Policy {policy['id']}")
            })
        
        # Get comprehensive answer across all policies
        answer = chat_with_multiple_policies(policies_data, question)
        
        # Log the multi-policy chat
        supabase.table("chat_logs").insert({
            "user_id": user_id,
            "policy_id": None,  # NULL for multi-policy chats
            "question": question,
            "answer": answer,
            "chat_type": "multiple_policies"
        }).execute()
        
        return {
            "answer": answer,
            "policies_count": len(policies),
            "policy_references": [p['policy_number'] for p in policies_data]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing multi-policy chat: {str(e)}")

@app.get("/history")
def get_comprehensive_history(user_id: str = Depends(get_current_user)):
    """
    Retrieve comprehensive activity history including uploads, analyses, chats, and comparisons.
    
    Args:
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: Comprehensive activity history with detailed metadata.
    """
    try:
        logging.debug("Fetching history for user_id: %s", user_id)

        # Get policy uploads
        try:
            policies = supabase.table("policies").select(
                "id", "policy_name", "policy_number", "created_at", "uploaded_file_url"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            logging.debug("Found %d policies", len(policies) if policies else 0)
        except Exception as e:
            logging.exception("Error fetching policies: %s", e)
            policies = []

        # Get chat logs
        try:
            chat_logs = supabase.table("chat_logs").select(
                "id", "policy_id", "question", "answer", "created_at", "chat_type"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            logging.debug("Found %d chat logs", len(chat_logs) if chat_logs else 0)
        except Exception as e:
            logging.exception("Error fetching chat logs: %s", e)
            chat_logs = []

        # Get comparisons
        try:
            comparisons = supabase.table("comparisons").select(
                "id", "policy_1_id", "policy_2_id", "created_at", "comparison_result"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            logging.debug("Found %d comparisons", len(comparisons) if comparisons else 0)
        except Exception as e:
            logging.exception("Error fetching comparisons: %s", e)
            comparisons = []
        
        # Build activity timeline
        activities = []
        
        # Add policy uploads
        for policy in policies:
            activities.append({
                "id": f"upload_{policy['id']}",
                "type": "upload",
                "title": f"Policy Upload: {policy.get('policy_name', 'Unnamed Policy')}",
                "description": policy.get('policy_number', 'No policy number provided'),
                "timestamp": policy['created_at'],
                "status": "completed",
                "details": {
                    "filesProcessed": 1,
                    "policyId": policy['id'],
                    "hasFile": bool(policy.get('uploaded_file_url'))
                }
            })
        
        # Add chat interactions
        for chat in chat_logs:
            chat_type = chat.get('chat_type', 'single_policy')
            title_suffix = "Multi-Policy Chat" if chat_type == "multiple_policies" else "Policy Chat"
            
            activities.append({
                "id": f"chat_{chat['id']}",
                "type": "chat",
                "title": f"{title_suffix}: {chat['question'][:50]}{'...' if len(chat['question']) > 50 else ''}",
                "description": f"Asked about: {chat['question']}",
                "timestamp": chat['created_at'],
                "status": "completed",
                "details": {
                    "questionsAnswered": 1,
                    "chatType": chat_type,
                    "policyId": chat.get('policy_id'),
                    "questionLength": len(chat['question']),
                    "answerLength": len(chat.get('answer', ''))
                }
            })
        
        # Add comparisons
        for comp in comparisons:
            activities.append({
                "id": f"comparison_{comp['id']}",
                "type": "comparison",
                "title": "Policy Comparison",
                "description": f"Compared policies {comp['policy_1_id']} and {comp['policy_2_id']}",
                "timestamp": comp['created_at'],
                "status": "completed",
                "details": {
                    "policiesCompared": 2,
                    "policy1Id": comp['policy_1_id'],
                    "policy2Id": comp['policy_2_id'],
                    "hasResult": bool(comp.get('comparison_result'))
                }
            })
        
        # Sort all activities by timestamp (most recent first)
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Add analysis activities (derived from policy uploads)
        analysis_activities = []
        for policy in policies:
            analysis_activities.append({
                "id": f"analysis_{policy['id']}",
                "type": "analysis",
                "title": f"Policy Analysis: {policy.get('policy_name', 'Unnamed Policy')}",
                "description": f"Analyzed {policy.get('policy_name', 'policy')} for coverage details and insights",
                "timestamp": policy['created_at'],
                "status": "completed",
                "details": {
                    "insightsGenerated": 3,  # Typical number of insights
                    "policyId": policy['id'],
                    "analysisType": "automatic"
                }
            })
        
        # Merge and sort all activities
        all_activities = activities + analysis_activities
        all_activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Calculate summary statistics
        stats = {
            "totalActivities": len(all_activities),
            "uploads": len([a for a in all_activities if a['type'] == 'upload']),
            "analyses": len([a for a in all_activities if a['type'] == 'analysis']),
            "chats": len([a for a in all_activities if a['type'] == 'chat']),
            "comparisons": len([a for a in all_activities if a['type'] == 'comparison']),
            "totalPolicies": len(policies)
        }

        logging.debug("Returning %d activities with stats: %s", len(all_activities), stats)

        return {
            "activities": all_activities,
            "stats": stats,
            "policies": policies,
            "success": True
        }
    except Exception as e:
        logging.exception("Exception in get_comprehensive_history: %s", str(e))
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching comprehensive history: {str(e)}")

@app.get("/activities")
def get_activities(user_id: str = Depends(get_current_user)):
    """
    Get dynamic user activities from the activities table.
    
    Returns:
        dict: Recent activities with real data
    """
    try:
        logging.debug("Fetching activities for user_id: %s", user_id)

        # Use service role client to bypass RLS for activities
        from src.db import supabase_storage
        # Try fetching activities with both clients to be sure
        try:
            activities = supabase_storage.table("activities").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
        except Exception:
            activities = supabase.table("activities").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()

        logging.debug("Service role query result: %s", activities)
        
        if activities and hasattr(activities, 'data') and isinstance(activities.data, list) and len(activities.data) > 0:
            logging.debug("Found %d activities", len(activities.data))
            formatted_activities = []
            for activity in activities.data:
                # Convert to frontend format
                formatted_activity = {
                    "id": activity["id"],
                    "type": activity["type"],
                    "title": activity["title"],
                    "description": activity["description"],
                    "timestamp": activity["created_at"],
                    "status": activity["status"],
                    "details": activity.get("details", {})
                }
                formatted_activities.append(formatted_activity)

            return {
                "activities": formatted_activities,
                "total": len(formatted_activities),
                "success": True
            }
        else:
            logging.debug("No activities found, returning sample activity")
            # If user has policies but no activities, generate "Policy Uploaded" activities from policies
            try:
                policies_res = supabase.table("policies").select("id, policy_name, created_at").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
                if policies_res.data:
                    generated_activities = []
                    for p in policies_res.data:
                        generated_activities.append({
                            "id": f"gen-{p['id']}",
                            "type": "upload",
                            "title": "Policy Uploaded",
                            "description": f"Uploaded {p.get('policy_name', 'Policy')}",
                            "timestamp": p['created_at'],
                            "status": "completed",
                            "details": {"policy_id": p['id']}
                        })
                    return {
                        "activities": generated_activities,
                        "total": len(generated_activities),
                        "success": True
                    }
            except Exception as e:
                logging.warning("Failed to generate activities from policies: %s", e)

            # Return sample activities if no real activities exist yet
            return {
                "activities": [
                    {
                        "id": "sample-1",
                        "type": "upload",
                        "title": "Welcome to ClaimWise!",
                        "description": "Upload your first policy to see activities here",
                        "timestamp": datetime.utcnow().isoformat(),
                        "status": "completed",
                        "details": {}
                    }
                ],
                "total": 1,
                "success": True
            }

    except Exception as e:
        logging.exception("Error fetching activities: %s", str(e))
        return {
            "activities": [],
            "total": 0,
            "success": False,
            "error": str(e)
        }


@app.get("/dashboard/stats")
def dashboard_stats(user_id: str = Depends(get_current_user)):
    """
    Return aggregated dashboard statistics relevant for analysis-only product.

    Returns:
        dict: counts for uploaded documents, processed documents, analyses, and comparisons
    """
    try:
        # Count uploaded documents/policies
        try:
            # Optimize: Select only ID to count
            policies = supabase.table("policies").select("id").eq("user_id", user_id).execute()
            uploaded_count = len(policies.data) if policies and policies.data is not None else 0
        except Exception as e:
            logging.exception("Error counting policies: %s", e)
            uploaded_count = 0

        # For documents processed, we consider policies with non-empty extracted_text
        try:
            # Optimize: Check for non-null extracted_text without fetching content if possible
            # For now, we'll assume if it's in the DB, it's processed or processing
            # To be more accurate but still fast, we could check a status column if it existed
            documents_processed = uploaded_count
        except Exception as e:
            logging.exception("Error counting processed documents: %s", e)
            documents_processed = uploaded_count  # fallback

        # Analyses completed - count policies that have been uploaded (since each upload gets analyzed)
        try:
            # Each uploaded policy gets analyzed, so analyses_completed = uploaded_count
            analyses_completed = uploaded_count
        except Exception:
            analyses_completed = uploaded_count

        # Comparisons run
        try:
            comparisons = supabase.table("comparisons").select("id").eq("user_id", user_id).execute().data
            comparisons_run = len(comparisons) if comparisons else 0
            logging.debug("Found %d comparisons for user %s", comparisons_run, user_id)
        except Exception as e:
            logging.exception("Error counting comparisons: %s", e)
            comparisons_run = 0
        logging.debug("dashboard_stats called for user_id: %s", user_id)
        logging.debug("Final counts - uploaded: %d, processed: %d, analyses: %d, comparisons: %d", uploaded_count, documents_processed, analyses_completed, comparisons_run)
        
        return {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
    except Exception as e:
        logging.exception("Exception in dashboard_stats: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")


@app.get("/dashboard/stats-dev")
def dashboard_stats_dev():
    """
    Development-only unauthenticated stats endpoint.
    Returns sample aggregated counts or attempts to compute global counts.
    Useful for local frontend debugging when auth tokens aren't present.
    """
    try:
        uploaded_count = 0
        documents_processed = 0
        analyses_completed = 0
        comparisons_run = 0

        try:
            policies_res = supabase.table("policies").select("id", "extracted_text").execute()
            policies = policies_res.data if policies_res and policies_res.data else []
            uploaded_count = len(policies)
            documents_processed = len([p for p in policies if p.get("extracted_text")])
        except Exception as e:
            logging.exception("/dashboard/stats-dev - policies query failed: %s", e)

        try:
            analyses_res = supabase.table("analyses").select("id").execute()
            analyses_completed = len(analyses_res.data) if analyses_res and analyses_res.data else 0
        except Exception:
            analyses_completed = uploaded_count  # fallback

        try:
            comparisons_res = supabase.table("comparisons").select("id").execute()
            comparisons_run = len(comparisons_res.data) if comparisons_res and comparisons_res.data else 0
            logging.debug("/dashboard/stats-dev - found %d total comparisons", comparisons_run)
        except Exception as e:
            logging.exception("/dashboard/stats-dev - comparisons query failed: %s", e)
            comparisons_run = 0

        # If no data found, return a small sample so frontend shows something
        if uploaded_count == 0 and documents_processed == 0 and analyses_completed == 0 and comparisons_run == 0:
            return {"uploadedDocuments": 2, "documentsProcessed": 2, "analysesCompleted": 2, "comparisonsRun": 1}

        return {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
    except Exception as e:
        logging.exception("Exception in dashboard_stats_dev: %s", str(e))
        return {"uploadedDocuments": 2, "documentsProcessed": 2, "analysesCompleted": 2, "comparisonsRun": 1}


@app.get("/dashboard/metrics")
def dashboard_metrics(user_id: str = Depends(get_current_user)):
    """
    Return comprehensive dashboard metrics including protection score, risks, coverage, and analysis.
    Fetches real data from the database instead of using hardcoded values.
    """
    try:
        # Get all user policies - Select validation_metadata instead of coverage_amount
        policies_res = supabase.table("policies").select("id, validation_score, validation_metadata, extracted_text, policy_name, created_at").eq("user_id", user_id).execute()
        policies = policies_res.data if policies_res and policies_res.data else []
        
        # Calculate protection score based on validation and coverage
        protection_score = 0
        risks_found = 0
        total_coverage = 0
        
        if policies:
            # Protection score based on average validation score and completeness
            validation_scores = []
            risk_count = 0
            coverage_amounts = []
            
            for policy in policies:
                # Get validation score if available
                validation_score = policy.get("validation_score", 0.75)
                validation_scores.append(validation_score * 100)  # Convert to percentage
                
                # Get analysis from metadata
                metadata = policy.get('validation_metadata') or {}
                if not isinstance(metadata, dict):
                    metadata = {}
                analysis_result = metadata.get('analysis_result', {})
                
                # Fallback: Try to extract coverage from extracted_text if analysis is missing
                if not analysis_result and policy.get('extracted_text'):
                    # Simple regex fallback for coverage amount
                    import re
                    text = policy.get('extracted_text', '')
                    # Look for patterns like "Sum Insured: Rs. 5,00,000" or "Coverage: 500000"
                    coverage_patterns = [
                        r'Sum Insured\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)',
                        r'Coverage Amount\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)',
                        r'Total Coverage\s*[:\-\s]\s*(?:Rs\.?|INR|₹)?\s*([\d,]+)'
                    ]
                    for pattern in coverage_patterns:
                        match = re.search(pattern, text, re.IGNORECASE)
                        if match:
                            try:
                                amount_str = match.group(1).replace(',', '')
                                coverage_amounts.append(float(amount_str))
                                break
                            except:
                                pass

                # Count risks/gaps from analysis if available
                if isinstance(analysis_result, dict):
                    risk_count += len(analysis_result.get("gaps_and_risks", []))
                    risk_count += len(analysis_result.get("exclusions", []))
                
                    # Extract coverage amount from analysis result
                    coverage = analysis_result.get("coverage_amount")
                    if coverage:
                        try:
                            # Remove currency symbols, commas, and whitespace
                            import re
                            clean_coverage = re.sub(r'[^\d.]', '', str(coverage))
                            if clean_coverage:
                                coverage_amounts.append(float(clean_coverage))
                        except (ValueError, TypeError):
                            logging.warning(f"Failed to parse coverage amount: {coverage}")
                            pass
            
            # Calculate average protection score
            if validation_scores:
                protection_score = int(sum(validation_scores) / len(validation_scores))
            
            risks_found = risk_count
            
            # Calculate total coverage
            if coverage_amounts:
                total_coverage = sum(coverage_amounts)
        
        # Format coverage as currency (assuming INR)
        if total_coverage > 0:
            # Convert to Lakh format (1 Lakh = 100,000)
            coverage_in_lakh = total_coverage / 100000
            total_coverage_formatted = f"₹{coverage_in_lakh:.2f} Lakh"
        else:
            total_coverage_formatted = "₹0 Lakh"
        
        # Generate quick insight based on data
        quick_insight = ""
        if not policies:
            quick_insight = "Scan your first policy to get personalized savings insights."
        elif risks_found > 0:
            quick_insight = f"Found {risks_found} potential gaps in your coverage. Review analysis for savings opportunities."
        elif protection_score >= 80:
            quick_insight = "Your policies provide comprehensive coverage. Consider reviewing annually for best deals."
        else:
            quick_insight = "Some coverage gaps detected. Explore our comparison tool to find better options."
        
        return {
            "protectionScore": protection_score,
            "risksFound": risks_found,
            "totalCoverage": total_coverage_formatted,
            "quickInsight": quick_insight,
            "policiesCount": len(policies)
        }
    except Exception as e:
        logging.exception("Exception in dashboard_metrics: %s", str(e))
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard metrics: {str(e)}")


@app.get("/dashboard/metrics-dev")
def dashboard_metrics_dev():
    """
    Development-only unauthenticated dashboard metrics endpoint.
    Returns sample data for frontend testing without auth.
    """
    try:
        # Fetch all policies regardless of user for dev purposes
        policies_res = supabase.table("policies").select("*").execute()
        policies = policies_res.data if policies_res and policies_res.data else []
        
        protection_score = 78
        risks_found = 0
        total_coverage = 0
        
        if policies:
            validation_scores = []
            risk_count = 0
            coverage_amounts = []
            
            for policy in policies[:5]:  # Limit to first 5 for dev
                validation_score = policy.get("validation_score", 0.75)
                validation_scores.append(validation_score * 100)
                
                analysis = supabase.table("analyses").select("analysis_result").eq("policy_id", policy['id']).execute()
                if analysis.data:
                    analysis_result = analysis.data[0].get("analysis_result", {})
                    if isinstance(analysis_result, dict):
                        risk_count += len(analysis_result.get("gaps_and_risks", []))
                
                coverage = policy.get("coverage_amount")
                if coverage:
                    try:
                        coverage_amounts.append(float(coverage))
                    except (ValueError, TypeError):
                        pass
            
            if validation_scores:
                protection_score = int(sum(validation_scores) / len(validation_scores))
            risks_found = risk_count
            if coverage_amounts:
                total_coverage = sum(coverage_amounts)
        
        if total_coverage > 0:
            coverage_in_lakh = total_coverage / 100000
            total_coverage_formatted = f"₹{coverage_in_lakh:.2f} Lakh"
        else:
            total_coverage_formatted = "₹50.00 Lakh"
        
        quick_insight = "You could save 15% on premiums by switching to HDFC Ergo." if policies else "Scan your first policy to get personalized savings insights."
        
        return {
            "protectionScore": protection_score,
            "risksFound": risks_found,
            "totalCoverage": total_coverage_formatted,
            "quickInsight": quick_insight,
            "policiesCount": len(policies)
        }
    except Exception as e:
        logging.exception("Exception in dashboard_metrics_dev: %s", str(e))
        return {
            "protectionScore": 78,
            "risksFound": 3,
            "totalCoverage": "₹50.00 Lakh",
            "quickInsight": "You could save 15% on premiums by switching to HDFC Ergo.",
            "policiesCount": 0
        }


@app.post("/create-test-comparison")
def create_test_comparison(user_id: str = Depends(get_current_user)):
    """
    Create a test comparison record for testing dashboard stats.
    """
    try:
        # Get user's policies to use in comparison
        policies = supabase.table("policies").select("id").eq("user_id", user_id).limit(2).execute().data
        if len(policies) >= 2:
            # Create comparison with real policy IDs
            result = supabase.table("comparisons").insert({
                "user_id": user_id,
                "policy_1_id": policies[0]['id'],
                "policy_2_id": policies[1]['id'],
                "comparison_result": "Test comparison created for dashboard testing"
            }).execute()
            logging.debug("Test comparison created: %s", result)
            return {"success": True, "message": "Test comparison created", "comparison_id": result.data[0].get('id') if result.data else None}
        else:
            # Create comparison with placeholder IDs
            result = supabase.table("comparisons").insert({
                "user_id": user_id,
                "policy_1_id": "test_policy_1",
                "policy_2_id": "test_policy_2", 
                "comparison_result": "Test comparison created for dashboard testing"
            }).execute()
            logging.debug("Test comparison created with placeholders: %s", result)
            return {"success": True, "message": "Test comparison created with placeholder IDs", "comparison_id": result.data[0].get('id') if result.data else None}
    except Exception as e:
        logging.exception("Error creating test comparison: %s", e)
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating test comparison: {str(e)}")


@app.get("/test-comparisons-table")
def test_comparisons_table():
    """
    Test endpoint to check if comparisons table exists and what data is in it.
    """
    try:
        # Try to read from comparisons table
        result = supabase.table("comparisons").select("*").limit(10).execute()
        logging.debug("Comparisons table query result: %s", result)

        return {
            "success": True,
            "total_comparisons": len(result.data) if result.data else 0,
            "sample_data": result.data[:5] if result.data else []
        }
    except Exception as e:
        logging.exception("Error querying comparisons table: %s", e)
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "message": "Comparisons table might not exist or has permission issues"
        }

@app.get("/history-legacy")
def history(user_id: str = Depends(get_current_user)):
    """
    Retrieve history of policies and comparisons for the user.
    
    Args:
        user_id (str): ID of the authenticated user.
    
    Returns:
        dict: List of policies and comparisons.
    """
    try:
        policies = supabase.table("policies").select("id", "policy_name", "policy_number", "created_at").eq("user_id", user_id).execute().data
        comparisons = supabase.table("comparisons").select("id", "policy_1_id", "policy_2_id", "created_at", "comparison_result").eq("user_id", user_id).execute().data
        return {"policies": policies, "comparisons": comparisons}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

@app.post("/refresh-token")
async def refresh(token: str = Form(...)):
    """
    Refresh the access token using a refresh token.
    
    Args:
        token (str): Refresh token from client.
    
    Returns:
        dict: New access and refresh tokens.
    """
    return await refresh_token(token)


from fastapi import APIRouter, UploadFile, HTTPException
from .gemini_files import upload_pdf, poll_file_status, extract_text

router = APIRouter()

@router.post("/test-gemini")
async def test_gemini(file: UploadFile):
    """
    Test endpoint for Gemini Files API integration.
    """
    temp_file_path = None
    try:
        # Save the uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name

        # Step 1: Upload the file (now returns file_id, file_uri)
        file_id, file_uri = upload_pdf(temp_file_path)

        # Step 2: Poll the file status
        status = poll_file_status(file_id)
        if status != "ACTIVE":
            raise HTTPException(status_code=500, detail="File did not become ACTIVE")

        # Step 3: Extract text locally only (no API usage)
        # Always use the local temporary file for extraction
        extracted_text = extract_text(temp_file_path)

        return {"file_id": file_id, "file_uri": file_uri, "status": status, "extracted_text": extracted_text}

    except Exception as e:
        logging.exception("/test-gemini failed")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Ensure temporary file is cleaned up
        try:
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        except Exception:
            pass

# Include the router for the /test-gemini endpoint
app.include_router(router)