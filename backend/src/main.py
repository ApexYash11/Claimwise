from fastapi import FastAPI, UploadFile,File ,HTTPException
from dotenv import load_dotenv
import os
from src.db import supabase
from src.OCR import extract_text
from src.llm import analyze_policy


load_dotenv() # loading  enviroment variable form .env
app = FastAPI()

@app.get("/")
def read_root():
    return {"Claimwise  is on "}

@app.post("/upload_policy/")
async def upload_policy(user_id: str, policy_name:str, file: UploadFile = File(...)):
    try:
        # reading file content
        file_bytes = await file.read()
        if not file.filename:
            raise HTTPException(status_code=400, detail="Uploaded file has no filename.")
        file_type = file.filename.split('.')[-1].lower()

        # extracting text using ocr 
        extracted_text = extract_text(file_bytes, file_type)
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No text extracted from the file.")
        
        # upload file the in the supabase 
        storage_path = f"policies/{user_id}/{file.filename}"
        supabase.storage.from_("policies").upload(storage_path, file_bytes)

        # creating a bucket in supbase dashboard
        file_url = supabase.storage.from_("policies-bucket").get_public_url(storage_path)

        # instering to poilicoes table
        data = {
            "user_id": user_id,
            "policy_name": policy_name,
            "extracted_text": extracted_text,
            "Uploaded_file_url": file_url
        }
        response = supabase.table("policies").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to save policy")

        return {"policy_id": response.data[0]["id"], "extracted_text": extracted_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"error Processing file : {str(e)}")

@ app.post("/analyze_policy/")
def analyze(policy_id: str):
    """
    Analyse policy using llm based on its extrected level

    using policy id to analyse 

    and return llm result 
    """

    try:
        policy=supabase.table("policies").select("extracted_text").eq("id", policy_id).eq("id",policy_id).execute().data[0]
        analysis=analyze_policy(policy["extracted_text"])
        return {"analysis":analysis}
    except IndexError:
        raise HTTPException(status_code=404, detail="Policy not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing policy: {str(e)}")    