from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends
from dotenv import load_dotenv
import os
from src.db import supabase
from src.OCR import extract_text
from src.llm import analyze_policy, compare_policies, chat_with_policy
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
    policy_name: str = Form(...),
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
    try:
        if file and text_input:
            raise HTTPException(status_code=400, detail="Provide either a file or text, not both.")
        elif not file and not text_input:
            raise HTTPException(status_code=400, detail="Provide a file or text.")

        extracted_text = None
        file_bytes = None
        if file:
            file_bytes = await file.read()
            if not file.filename:
                raise HTTPException(status_code=400, detail="File must have a valid filename")
            file_type = file.filename.split('.')[-1].lower()
            extracted_text = extract_text(file_bytes, file_type)
            if not extracted_text:
                raise HTTPException(status_code=400, detail="No text extracted from file.")
        else:
            extracted_text = text_input

        if file and file_bytes:
            storage_path = f"policies/{user_id}/{file.filename}"
            supabase.storage.from_("policies-bucket").upload(storage_path, file_bytes)
            file_url = supabase.storage.from_("policies-bucket").get_public_url(storage_path)
        else:
            file_url = None

        data = {
            "user_id": user_id,
            "policy_name": policy_name,
            "policy_number": policy_number,
            "extracted_text": extracted_text,
            "uploaded_file_url": file_url
        }
        response = supabase.table("policies").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save policy.")
        
        return {"policy_id": response.data[0]['id'], "extracted_text": extracted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing input: {str(e)}")

@app.post("/analyze-policy")
def analyze(policy_id: str, user_id: str = Depends(get_current_user)):
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

@app.get("/history")
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