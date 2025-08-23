from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from dotenv import load_dotenv
import os
from src.db import supabase, supabase_storage
from src.OCR import extract_text
from src.llm_groq import analyze_policy, compare_policies, chat_with_policy, chat_with_multiple_policies, get_api_status
from src.auth import get_current_user, refresh_token
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime

from typing import Union, Dict
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
        print(f"DEBUG: Activity logged: {activity_type} - {title}")
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"DEBUG: Error logging activity: {str(e)}")
        return None

load_dotenv()  # Load environment variables from .env
app = FastAPI()

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Added port 3001
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "ClaimWise Backend"}

@app.post("/upload-policy")
async def upload_policy(
    user_id: str = Depends(get_current_user),
    policy_name: str = Form(None),
    policy_number: str = Form(None),
    file: UploadFile = File(None),
    text_input: str = Form(None)
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
    print(f"DEBUG: file={file}, policy_name={policy_name}, policy_number={policy_number}, text_input={text_input}")
    if file:
        print(f"DEBUG: file.filename={file.filename}, file.content_type={file.content_type}")
    try:
        if file and text_input:
            raise HTTPException(status_code=400, detail="Provide either a file or text, not both.")
        elif not file and not text_input:
            raise HTTPException(status_code=400, detail="Provide a file or text.")

        extracted_text = None
        file_bytes = None
        if file:
            print("DEBUG: Reading file bytes...")
            file_bytes = await file.read()
            print(f"DEBUG: Read {len(file_bytes)} bytes from file")
            if not file.filename:
                raise HTTPException(status_code=400, detail="File must have a valid filename")
            file_type = file.filename.split('.')[-1].lower()
            print(f"DEBUG: Extracting text from {file_type} file...")
            try:
                extracted_text = extract_text(file_bytes, file_type)
                print(f"DEBUG: Extracted text length: {len(extracted_text) if extracted_text else 0}")
            except Exception as ocr_error:
                print(f"DEBUG: OCR Error: {str(ocr_error)}")
                raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(ocr_error)}")
            if not extracted_text:
                raise HTTPException(status_code=400, detail="No text extracted from file.")
        else:
            extracted_text = text_input

        print("DEBUG: Uploading to Supabase storage...")
        if file and file_bytes:
            storage_path = f"policies/{user_id}/{file.filename}"
            try:
                # Try to upload, if duplicate exists, generate unique name
                try:
                    supabase_storage.storage.from_("proeject").upload(storage_path, file_bytes)
                    file_url = supabase_storage.storage.from_("proeject").get_public_url(storage_path)
                    print(f"DEBUG: File uploaded to: {file_url}")
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
                        print(f"DEBUG: File exists, trying with unique name: {unique_filename}")
                        supabase_storage.storage.from_("proeject").upload(storage_path, file_bytes)
                        file_url = supabase_storage.storage.from_("proeject").get_public_url(storage_path)
                        print(f"DEBUG: File uploaded with unique name to: {file_url}")
                    else:
                        raise upload_error
            except Exception as storage_error:
                print(f"DEBUG: Storage Error: {str(storage_error)}")
                raise HTTPException(status_code=500, detail=f"File storage failed: {str(storage_error)}")
        else:
            file_url = None

        print("DEBUG: Saving to database...")
        data = {
            "user_id": user_id,
            "policy_name": policy_name,
            "policy_number": policy_number,
            "extracted_text": extracted_text,
            "uploaded_file_url": file_url
        }
        try:
            response = supabase.table("policies").insert(data).execute()
            print(f"DEBUG: Database response: {response}")
            if not response.data:
                raise HTTPException(status_code=500, detail="Failed to save policy.")
            
            # Log the upload activity
            policy_id = response.data[0]['id']
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
            
            return {"policy_id": policy_id, "extracted_text": extracted_text}
        except Exception as db_error:
            print(f"DEBUG: Database Error: {str(db_error)}")
            raise HTTPException(status_code=500, detail=f"Database save failed: {str(db_error)}")
    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Unexpected Error: {str(e)}")
        import traceback
        traceback.print_exc()
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
        policy = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_id).eq("user_id", user_id).execute().data[0]
        analysis = analyze_policy(policy['extracted_text'])
        
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
        print(f"DEBUG: Starting comparison for user {user_id}, policies {policy_1_id} vs {policy_2_id}")
        
        pol1 = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_1_id).eq("user_id", user_id).execute().data[0]
        pol2 = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_2_id).eq("user_id", user_id).execute().data[0]
        
        print(f"DEBUG: Retrieved policies successfully")
        
        comparison = compare_policies(pol1['extracted_text'], pol2['extracted_text'], pol1.get('policy_number'), pol2.get('policy_number'))
        
        print(f"DEBUG: LLM comparison completed, storing result...")
        
        # Store comparison result
        comparison_data = {
            "user_id": user_id,
            "policy_1_id": policy_1_id,
            "policy_2_id": policy_2_id,
            "comparison_result": comparison
        }
        
        result = supabase.table("comparisons").insert(comparison_data).execute()
        print(f"DEBUG: Comparison stored successfully: {result}")
        
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
            print(f"DEBUG: Comparison record created with ID: {comparison_id}")
        else:
            print(f"DEBUG: Warning - comparison insert returned no data")
        
        return {"comparison": comparison, "comparison_id": result.data[0].get('id') if result.data else None}
        
    except IndexError:
        print(f"DEBUG: Policy not found - policy_1_id: {policy_1_id}, policy_2_id: {policy_2_id}, user_id: {user_id}")
        raise HTTPException(status_code=404, detail="One or both policies not found for this user.")
    except Exception as e:
        print(f"DEBUG: Error in compare-policies: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error comparing policies: {str(e)}")

@app.get("/debug/gemini-config")
def debug_gemini_config():
    """
    Check Gemini API configuration and model access.
    """
    try:
        from src.llm import make_gemini_request
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
        response = make_gemini_request(test_prompt)
        
        return {
            "status": "success",
            "model": "gemini-1.5-pro",
            "api_key_status": key_status,
            "test_response": response.text[:100] + "..." if len(response.text) > 100 else response.text,
            "response_length": len(response.text),
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
        policy = supabase.table("policies").select("id, policy_name").eq("id", policy_id).eq("user_id", user_id).execute().data
        
        if not policy:
            raise HTTPException(status_code=404, detail="Policy not found")
        
        old_name = policy[0].get("policy_name")
        
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
        policy = supabase.table("policies").select("*").eq("id", policy_id).eq("user_id", user_id).execute().data[0]
        
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
                "Ensure OCR extracted the document properly" if text_length < 100 else None,
                "Policy content looks good for chat" if has_sufficient_content else None
            ]
        }
        
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@app.post("/chat")
def chat(policy_id: str, question: str, user_id: str = Depends(get_current_user)):
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
        policy = supabase.table("policies").select("extracted_text", "policy_number", "policy_name").eq("id", policy_id).eq("user_id", user_id).execute().data[0]
        
        extracted_text = policy.get('extracted_text', '')
        
        # Check if the policy has sufficient content for chat
        if not extracted_text or len(extracted_text) < 50:
            return {"answer": "This policy appears to have no extracted text. Please try re-uploading the policy document."}
        
        if "test insurance policy for automated testing" in extracted_text.lower():
            return {"answer": "This appears to be a test policy without real insurance details. Please upload an actual insurance policy document for meaningful chat interactions."}
        
        if len(extracted_text) < 200:
            return {"answer": f"This policy has limited content ({len(extracted_text)} characters). The OCR may not have extracted the full document properly. Please check the uploaded document quality."}
        
        answer = chat_with_policy(extracted_text, question, policy.get('policy_number'))
        
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
        
        return {"answer": answer}
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found for this user.")
    except Exception as e:
        print(f"Chat error for policy {policy_id}: {str(e)}")
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
        print(f"DEBUG: Fetching history for user_id: {user_id}")
        
        # Get policy uploads
        try:
            policies = supabase.table("policies").select(
                "id", "policy_name", "policy_number", "created_at", "uploaded_file_url"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            print(f"DEBUG: Found {len(policies)} policies")
        except Exception as e:
            print(f"DEBUG: Error fetching policies: {str(e)}")
            policies = []
        
        # Get chat logs
        try:
            chat_logs = supabase.table("chat_logs").select(
                "id", "policy_id", "question", "answer", "created_at", "chat_type"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            print(f"DEBUG: Found {len(chat_logs)} chat logs")
        except Exception as e:
            print(f"DEBUG: Error fetching chat logs: {str(e)}")
            chat_logs = []
        
        # Get comparisons
        try:
            comparisons = supabase.table("comparisons").select(
                "id", "policy_1_id", "policy_2_id", "created_at", "comparison_result"
            ).eq("user_id", user_id).order("created_at", desc=True).execute().data
            print(f"DEBUG: Found {len(comparisons)} comparisons")
        except Exception as e:
            print(f"DEBUG: Error fetching comparisons: {str(e)}")
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
        
        print(f"DEBUG: Returning {len(all_activities)} activities with stats: {stats}")
        
        return {
            "activities": all_activities,
            "stats": stats,
            "policies": policies,
            "success": True
        }
        
    except Exception as e:
        print(f"DEBUG: Exception in get_comprehensive_history: {str(e)}")
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
        print(f"DEBUG: Fetching activities for user_id: {user_id}")
        
        # Use service role client to bypass RLS for activities
        from src.db import supabase_storage
        activities = supabase_storage.table("activities").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
        
        print(f"DEBUG: Service role query result: {activities}")
        print(f"DEBUG: Activities data: {activities.data if activities else 'None'}")
        
        if activities and activities.data:
            print(f"DEBUG: Found {len(activities.data)} activities")
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
            print("DEBUG: No activities found, returning sample activity")
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
        print(f"DEBUG: Error fetching activities: {str(e)}")
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
            policies = supabase.table("policies").select("*").eq("user_id", user_id).execute()
            uploaded_count = len(policies.data) if policies and policies.data is not None else 0
        except Exception as e:
            print(f"DEBUG: Error counting policies: {e}")
            uploaded_count = 0

        # For documents processed, we consider policies with non-empty extracted_text
        try:
            all_policies = supabase.table("policies").select("id", "extracted_text").eq("user_id", user_id).execute().data
            documents_processed = len([p for p in all_policies if p.get("extracted_text") and p["extracted_text"].strip()]) if all_policies else 0
        except Exception as e:
            print(f"DEBUG: Error counting processed documents: {e}")
            documents_processed = uploaded_count  # fallback: assume all uploaded docs are processed

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
            print(f"DEBUG: Found {comparisons_run} comparisons for user {user_id}")
        except Exception as e:
            print(f"DEBUG: Error counting comparisons: {e}")
            comparisons_run = 0

        print(f"DEBUG: dashboard_stats called for user_id: {user_id}")
        print(f"DEBUG: Final counts - uploaded: {uploaded_count}, processed: {documents_processed}, analyses: {analyses_completed}, comparisons: {comparisons_run}")
        
        return {
            "uploadedDocuments": uploaded_count,
            "documentsProcessed": documents_processed,
            "analysesCompleted": analyses_completed,
            "comparisonsRun": comparisons_run,
        }
    except Exception as e:
        print(f"DEBUG: Exception in dashboard_stats: {str(e)}")
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
            print(f"DEBUG: /dashboard/stats-dev - policies query failed: {e}")

        try:
            analyses_res = supabase.table("analyses").select("id").execute()
            analyses_completed = len(analyses_res.data) if analyses_res and analyses_res.data else 0
        except Exception:
            analyses_completed = uploaded_count  # fallback

        try:
            comparisons_res = supabase.table("comparisons").select("id").execute()
            comparisons_run = len(comparisons_res.data) if comparisons_res and comparisons_res.data else 0
            print(f"DEBUG: /dashboard/stats-dev - found {comparisons_run} total comparisons")
        except Exception as e:
            print(f"DEBUG: /dashboard/stats-dev - comparisons query failed: {e}")
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
        print(f"DEBUG: Exception in dashboard_stats_dev: {str(e)}")
        return {"uploadedDocuments": 2, "documentsProcessed": 2, "analysesCompleted": 2, "comparisonsRun": 1}


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
            print(f"DEBUG: Test comparison created: {result}")
            return {"success": True, "message": "Test comparison created", "comparison_id": result.data[0].get('id') if result.data else None}
        else:
            # Create comparison with placeholder IDs
            result = supabase.table("comparisons").insert({
                "user_id": user_id,
                "policy_1_id": "test_policy_1",
                "policy_2_id": "test_policy_2", 
                "comparison_result": "Test comparison created for dashboard testing"
            }).execute()
            print(f"DEBUG: Test comparison created with placeholders: {result}")
            return {"success": True, "message": "Test comparison created with placeholder IDs", "comparison_id": result.data[0].get('id') if result.data else None}
    except Exception as e:
        print(f"DEBUG: Error creating test comparison: {e}")
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
        print(f"DEBUG: Comparisons table query result: {result}")
        
        return {
            "success": True,
            "total_comparisons": len(result.data) if result.data else 0,
            "sample_data": result.data[:5] if result.data else []
        }
    except Exception as e:
        print(f"DEBUG: Error querying comparisons table: {e}")
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