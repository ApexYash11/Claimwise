# backend/src/models.py
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class UploadResponse(BaseModel):
    policy_id: str
    extracted_text: str
    status: str
    indexing_mode: str = "background"  # "background" or "synchronous"

class ChatRequest(BaseModel):
    policy_id: str
    question: str = Field(..., min_length=1, max_length=1000)

class ChatResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]  # [{"id": int, "excerpt": str, "score": float}]

class PolicyAnalysisResponse(BaseModel):
    policy_type: str
    provider: str
    policy_number: str
    coverage_amount: str
    premium: str
    deductible: str
    expiration_date: str
    coverage: str
    exclusions: str
    claim_process: str
    key_features: List[str]
    claim_readiness_score: int

class ComparisonResponse(BaseModel):
    comparison: str
    comparison_id: Optional[str] = None

class ActivityResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    timestamp: str
    status: str
    details: Dict[str, Any]

class DashboardStatsResponse(BaseModel):
    uploadedDocuments: int
    documentsProcessed: int
    analysesCompleted: int
    comparisonsRun: int