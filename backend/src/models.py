# backend/src/models.py
from typing import Optional, List
from pydantic import BaseModel

class UploadResponse(BaseModel):
    document_id: str
    status: str

class ChatRequest(BaseModel):
    query: str
    document_id: Optional[str] = None
    k: int = 5

class ChatResponse(BaseModel):
    answer: str
    sources: List[str]