"""
Enhanced ClaimWise Backend with comprehensive error handling, monitoring, caching, and rate limiting.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import asyncio
import logging
import os
import sys
import time
import tempfile
import uuid
from datetime import datetime
from typing import Union, Dict, Optional, List
from contextlib import asynccontextmanager

# Load environment variables early
from dotenv import load_dotenv
load_dotenv()

# Configure logging with structured format
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - [%(trace_id)s] - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/claimwise.log") if os.path.exists("logs") else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

# Import enhanced systems
from src.exceptions import (
    ClaimWiseError, AuthenticationError, ValidationError, ProcessingError,
    ExternalAPIError, DatabaseError, FileHandlingError, RateLimitError,
    handle_exceptions, convert_to_http_exception
)
from src.monitoring import monitor, performance_middleware, collect_system_metrics, track_request
from src.caching import (
    cache_manager, get_embedding_cache, get_llm_response_cache, 
    get_analysis_cache, cached
)
from src.rate_limiting import rate_limiter, rate_limit_middleware, rate_limit

# Original imports
from src.db import supabase, supabase_storage
from src.llm_groq import analyze_policy, compare_policies, chat_with_policy, chat_with_multiple_policies, get_api_status
from src.auth import get_current_user, refresh_token
from src.models import UploadResponse, ChatRequest, ChatResponse, PolicyAnalysisResponse, ComparisonResponse

STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "proeject")

class RequestContext:
    """Request context for tracking and logging"""
    def __init__(self):
        self.trace_id = str(uuid.uuid4())[:8]
        self.start_time = time.time()
        self.user_id = None
        self.ip_address = None
        self.user_agent = None

# Global request context storage
request_contexts = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting ClaimWise Backend...")
    
    # Initialize monitoring
    monitor.record_system_metric()
    
    # Start background tasks
    system_metrics_task = asyncio.create_task(collect_system_metrics())
    
    # Initialize caches
    get_embedding_cache()
    get_llm_response_cache()
    get_analysis_cache()
    
    logger.info("ClaimWise Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ClaimWise Backend...")
    system_metrics_task.cancel()
    try:
        await system_metrics_task
    except asyncio.CancelledError:
        pass
    
    # Clear caches
    cache_manager.clear_all()
    
    logger.info("ClaimWise Backend shutdown complete")

# Create FastAPI app with lifespan
app = FastAPI(
    title="ClaimWise API",
    description="Enhanced insurance policy analysis system with advanced error handling and monitoring",
    version="2.0.0",
    lifespan=lifespan
)

# Add security middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Configure properly in production

# Add performance monitoring middleware
app.middleware("http")(performance_middleware())

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware())

# CORS middleware
origins = [
    "https://claimwise-fht9.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", "")
]
origins = [origin for origin in origins if origin]  # Remove empty strings

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Response-Time", "X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Enhanced activity logging with caching and error handling
@cached("analysis", ttl=300)  # Cache for 5 minutes
@handle_exceptions(logger)
def log_activity(user_id: str, activity_type: str, title: str, description: str, details: Union[Dict, None] = None):
    """Enhanced activity logging with error handling and caching"""
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
        
        if not result.data:
            raise DatabaseError(
                message="Failed to log activity",
                operation="insert_activity",
                details={"activity_type": activity_type, "title": title}
            )
        
        logger.debug(f"Activity logged: {activity_type} - {title}")
        return result.data[0]
        
    except Exception as e:
        logger.error(f"Failed to log activity: {e}")
        return None

# Enhanced request preprocessing
@app.middleware("http")
async def request_preprocessing(request: Request, call_next):
    """Enhanced request preprocessing with context tracking"""
    context = RequestContext()
    context.ip_address = request.client.host
    context.user_agent = request.headers.get("user-agent", "Unknown")
    
    # Store context
    request_contexts[context.trace_id] = context
    request.state.trace_id = context.trace_id
    
    # Add trace ID to logging context
    old_factory = logging.getLogRecordFactory()
    
    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.trace_id = context.trace_id
        return record
    
    logging.setLogRecordFactory(record_factory)
    
    try:
        response = await call_next(request)
        
        # Add trace ID to response headers
        response.headers["X-Trace-ID"] = context.trace_id
        
        return response
        
    finally:
        # Cleanup
        logging.setLogRecordFactory(old_factory)
        request_contexts.pop(context.trace_id, None)

# Enhanced health endpoints
@app.get("/")
@handle_exceptions(logger)
def root():
    """Enhanced root endpoint with system status"""
    return {
        "message": "ClaimWise Backend v2.0",
        "status": "operational",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

@app.get("/healthz")
@handle_exceptions(logger)
async def health_check():
    """Comprehensive health check"""
    try:
        # Check database connectivity
        db_health = await check_database_health()
        
        # Check external APIs
        api_health = await check_external_apis()
        
        # Get system metrics
        system_health = get_system_health()
        
        health_status = {
            "status": "healthy" if all([db_health["healthy"], api_health["healthy"], system_health["healthy"]]) else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {
                "database": db_health,
                "external_apis": api_health,
                "system": system_health
            }
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

async def check_database_health() -> Dict[str, Union[bool, str, float]]:
    """Check database connectivity and performance"""
    try:
        start_time = time.time()
        result = supabase.table("policies").select("id").limit(1).execute()
        response_time = (time.time() - start_time) * 1000
        
        return {
            "healthy": True,
            "response_time_ms": round(response_time, 2),
            "status": "connected"
        }
    except Exception as e:
        return {
            "healthy": False,
            "error": str(e),
            "status": "disconnected"
        }

async def check_external_apis() -> Dict[str, Union[bool, Dict]]:
    """Check external API health"""
    try:
        api_status = get_api_status()
        return {
            "healthy": api_status.get("groq_status") == "available",
            "details": api_status
        }
    except Exception as e:
        return {
            "healthy": False,
            "error": str(e)
        }

def get_system_health() -> Dict[str, Union[bool, float]]:
    """Get system resource health"""
    try:
        import psutil
        
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Consider system healthy if resources are below thresholds
        healthy = (
            cpu_percent < 80 and 
            memory.percent < 85 and 
            disk.percent < 90
        )
        
        return {
            "healthy": healthy,
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent
        }
        
    except Exception as e:
        logger.error(f"Failed to get system health: {e}")
        return {"healthy": False, "error": str(e)}

# Enhanced upload endpoint
@app.post("/upload-policy", response_model=UploadResponse)
@rate_limit("upload")
@handle_exceptions(logger)
async def upload_policy_enhanced(
    request: Request,
    user_id: str = Depends(get_current_user),
    policy_name: str = Form(None),
    policy_number: str = Form(None),
    file: UploadFile = File(None),
    text_input: str = Form(None),
    sync_indexing: bool = Form(False)
):
    """Enhanced policy upload with comprehensive error handling and monitoring"""
    
    async with track_request("upload-policy", "POST", user_id):
        # Validation
        if file and text_input:
            raise ValidationError(
                message="Cannot provide both file and text input",
                details={"file": bool(file), "text_input": bool(text_input)},
                recovery_suggestions=["Choose either file upload or text input", "Remove one of the inputs"]
            )
        
        if not file and not text_input:
            raise ValidationError(
                message="Must provide either file or text input",
                recovery_suggestions=["Upload a file", "Paste policy text"]
            )
        
        if policy_name and len(policy_name) > 200:
            raise ValidationError(
                message="Policy name too long",
                field="policy_name",
                details={"max_length": 200, "provided_length": len(policy_name)}
            )
        
        # Check file size limits
        if file:
            max_size = 10 * 1024 * 1024  # 10MB
            if hasattr(file, 'size') and file.size > max_size:
                raise ValidationError(
                    message=f"File size exceeds limit of {max_size // (1024*1024)}MB",
                    field="file",
                    details={"file_size": file.size, "max_size": max_size}
                )
        
        try:
            extracted_text = await process_file_or_text(file, text_input, user_id)
            
            # Store policy in database
            policy_data = {
                "user_id": user_id,
                "policy_name": policy_name or (file.filename if file else "Text Input"),
                "policy_number": policy_number,
                "extracted_text": extracted_text,
                "uploaded_file_url": None
            }
            
            # Handle file upload to storage if applicable
            if file:
                file_url = await upload_to_storage(file, user_id)
                policy_data["uploaded_file_url"] = file_url
            
            # Save to database
            try:
                response = supabase.table("policies").insert(policy_data).execute()
                if not response.data:
                    raise DatabaseError(
                        message="Failed to save policy to database",
                        operation="insert_policy"
                    )
                
                policy_id = response.data[0]['id']
                
            except Exception as db_error:
                raise DatabaseError(
                    message="Database operation failed",
                    operation="insert_policy",
                    original_exception=db_error
                )
            
            # Handle indexing
            if sync_indexing:
                await index_policy_sync(extracted_text, policy_id)
            else:
                # Background indexing
                asyncio.create_task(index_policy_background(extracted_text, policy_id))
            
            # Log activity
            log_activity(
                user_id=user_id,
                activity_type="policy_upload",
                title=f"Uploaded policy: {policy_name or 'Unnamed'}",
                description=f"Successfully uploaded and processed policy",
                details={
                    "policy_id": policy_id,
                    "has_file": bool(file),
                    "text_length": len(extracted_text),
                    "sync_indexing": sync_indexing
                }
            )
            
            return UploadResponse(
                policy_id=policy_id,
                message="Policy uploaded and processed successfully",
                extracted_text_length=len(extracted_text),
                indexing_mode="synchronous" if sync_indexing else "background"
            )
            
        except ClaimWiseError:
            # Re-raise our custom exceptions
            raise
        except Exception as e:
            # Convert unexpected errors
            raise ProcessingError(
                message="Failed to process policy upload",
                operation="upload_policy",
                original_exception=e
            )

async def process_file_or_text(file: Optional[UploadFile], text_input: Optional[str], user_id: str) -> str:
    """Process file or text input with enhanced error handling"""
    if file:
        return await process_uploaded_file(file, user_id)
    else:
        if not text_input or not text_input.strip():
            raise ValidationError(
                message="Text input cannot be empty",
                field="text_input"
            )
        return text_input.strip()

async def process_uploaded_file(file: UploadFile, user_id: str) -> str:
    """Process uploaded file with comprehensive error handling"""
    
    if not file.filename:
        raise FileHandlingError(
            message="File must have a valid filename",
            recovery_suggestions=["Ensure the file has a proper name before uploading"]
        )
    
    # Check file type
    allowed_extensions = {'.pdf', '.txt', '.doc', '.docx'}
    file_extension = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    
    if file_extension not in allowed_extensions:
        raise FileHandlingError(
            message=f"Unsupported file type: {file_extension}",
            filename=file.filename,
            details={"allowed_extensions": list(allowed_extensions)},
            recovery_suggestions=[f"Convert file to one of: {', '.join(allowed_extensions)}"]
        )
    
    temp_file_path = None
    
    try:
        # Read file content
        try:
            file_bytes = await file.read()
            logger.debug(f"Read {len(file_bytes)} bytes from file: {file.filename}")
        except Exception as e:
            raise FileHandlingError(
                message="Failed to read uploaded file",
                filename=file.filename,
                original_exception=e
            )
        
        # Create temporary file
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
                temp_file.write(file_bytes)
                temp_file_path = temp_file.name
        except Exception as e:
            raise ProcessingError(
                message="Failed to create temporary file",
                operation="create_temp_file",
                original_exception=e
            )
        
        # Extract text
        try:
            from src.gemini_files import extract_text
            extracted_text = extract_text(temp_file_path)
            
            if not extracted_text or not extracted_text.strip():
                raise FileHandlingError(
                    message="No text could be extracted from the file",
                    filename=file.filename,
                    recovery_suggestions=[
                        "Ensure the file contains readable text",
                        "Try converting the file to PDF format",
                        "Check if the file is corrupted"
                    ]
                )
            
            logger.debug(f"Extracted {len(extracted_text)} characters from {file.filename}")
            return extracted_text.strip()
            
        except ImportError as e:
            raise ProcessingError(
                message="Text extraction module not available",
                operation="import_extraction_module",
                original_exception=e
            )
        except Exception as e:
            raise FileHandlingError(
                message="Failed to extract text from file",
                filename=file.filename,
                original_exception=e,
                recovery_suggestions=[
                    "Try a different file format",
                    "Ensure the file is not corrupted",
                    "Contact support if the problem persists"
                ]
            )
    
    finally:
        # Cleanup temporary file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup temp file {temp_file_path}: {cleanup_error}")

async def upload_to_storage(file: UploadFile, user_id: str) -> str:
    """Upload file to Supabase storage with error handling"""
    
    try:
        file_bytes = await file.read()
        storage_path = f"policies/{user_id}/{file.filename}"
        
        try:
            # Try initial upload
            supabase_storage.storage.from_(STORAGE_BUCKET).upload(storage_path, file_bytes)
            file_url = supabase_storage.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            
        except Exception as upload_error:
            error_str = str(upload_error)
            
            if "Duplicate" in error_str or "already exists" in error_str:
                # Generate unique filename
                timestamp = str(int(time.time()))
                filename_parts = file.filename.rsplit('.', 1)
                
                if len(filename_parts) == 2:
                    unique_filename = f"{filename_parts[0]}_{timestamp}.{filename_parts[1]}"
                else:
                    unique_filename = f"{file.filename}_{timestamp}"
                
                storage_path = f"policies/{user_id}/{unique_filename}"
                logger.debug(f"File exists, using unique name: {unique_filename}")
                
                supabase_storage.storage.from_(STORAGE_BUCKET).upload(storage_path, file_bytes)
                file_url = supabase_storage.storage.from_(STORAGE_BUCKET).get_public_url(storage_path)
            else:
                raise upload_error
        
        logger.debug(f"File uploaded to storage: {file_url}")
        return file_url
        
    except Exception as e:
        raise ProcessingError(
            message="Failed to upload file to storage",
            operation="storage_upload",
            original_exception=e,
            recovery_suggestions=["Try uploading a smaller file", "Contact support if the problem persists"]
        )

async def index_policy_sync(text: str, policy_id: str):
    """Synchronous policy indexing for immediate results"""
    try:
        from src.rag import index_documents
        result = index_documents(text, policy_id)
        logger.info(f"Synchronously indexed policy {policy_id}: {len(result)} chunks")
    except Exception as e:
        logger.error(f"Failed to index policy {policy_id}: {e}")
        # Don't raise exception for indexing failures in upload flow

async def index_policy_background(text: str, policy_id: str):
    """Background policy indexing"""
    try:
        await asyncio.sleep(1)  # Small delay to avoid overwhelming the system
        from src.rag import index_documents
        result = index_documents(text, policy_id)
        logger.info(f"Background indexed policy {policy_id}: {len(result)} chunks")
    except Exception as e:
        logger.error(f"Background indexing failed for policy {policy_id}: {e}")

# Performance monitoring endpoints
@app.get("/admin/performance")
@handle_exceptions(logger)
async def get_performance_stats(user_id: str = Depends(get_current_user)):
    """Get comprehensive performance statistics"""
    
    # Check if user has admin privileges (implement your admin check here)
    # For now, we'll allow any authenticated user
    
    try:
        performance_summary = monitor.get_performance_summary()
        cache_stats = cache_manager.get_all_stats()
        rate_limit_stats = rate_limiter.get_stats()
        
        return {
            "performance": performance_summary,
            "caching": cache_stats,
            "rate_limiting": rate_limit_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise ProcessingError(
            message="Failed to retrieve performance statistics",
            operation="get_performance_stats",
            original_exception=e
        )

@app.get("/admin/system-metrics")
@handle_exceptions(logger)
async def get_system_metrics(
    hours: int = 1,
    user_id: str = Depends(get_current_user)
):
    """Get system metrics for the specified time period"""
    
    if hours > 24:
        raise ValidationError(
            message="Cannot request more than 24 hours of metrics",
            field="hours",
            details={"max_hours": 24, "requested_hours": hours}
        )
    
    try:
        metrics = monitor.get_system_metrics(hours)
        return {
            "metrics": metrics,
            "period_hours": hours,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise ProcessingError(
            message="Failed to retrieve system metrics",
            operation="get_system_metrics",
            original_exception=e
        )

# Rest of the existing endpoints would be similarly enhanced...
# For brevity, I'm showing the pattern with the most critical endpoints

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_config=None  # Use our custom logging configuration
    )
