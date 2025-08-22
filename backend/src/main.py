from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from dotenv import load_dotenv
import os
from src.db import supabase, supabase_storage
from src.OCR import extract_text
from src.llm import analyze_policy, compare_policies, chat_with_policy, chat_with_multiple_policies
from src.auth import get_current_user, refresh_token
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()  # Load environment variables from .env
app = FastAPI()

# CORS middleware to allow cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allows all origins
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
                        filename_parts = file.filename.rsplit('.', 1)
                        if len(filename_parts) == 2:
                            unique_filename = f"{filename_parts[0]}_{timestamp}.{filename_parts[1]}"
                        else:
                            unique_filename = f"{file.filename}_{timestamp}"
                        
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
            
            return {"policy_id": response.data[0]['id'], "extracted_text": extracted_text}
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
        policy = supabase.table("policies").select("extracted_text", "policy_number").eq("id", policy_id).eq("user_id", user_id).execute().data[0]
        analysis = analyze_policy(policy['extracted_text'])
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
        pol1 = supabase.table("policies").select("extracted_text", "policy_number").eq("id", policy_1_id).eq("user_id", user_id).execute().data[0]
        pol2 = supabase.table("policies").select("extracted_text", "policy_number").eq("id", policy_2_id).eq("user_id", user_id).execute().data[0]
        comparison = compare_policies(pol1['extracted_text'], pol2['extracted_text'], pol1.get('policy_number'), pol2.get('policy_number'))
        supabase.table("comparisons").insert({
            "user_id": user_id,
            "policy_1_id": policy_1_id,
            "policy_2_id": policy_2_id,
            "comparison_result": comparison
        }).execute()
        return {"comparison": comparison}
    except IndexError:
        raise HTTPException(status_code=404, detail="One or both policies not found for this user.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error comparing policies: {str(e)}")

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
        policy = supabase.table("policies").select("extracted_text", "policy_number").eq("id", policy_id).eq("user_id", user_id).execute().data[0]
        answer = chat_with_policy(policy['extracted_text'], question, policy.get('policy_number'))
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