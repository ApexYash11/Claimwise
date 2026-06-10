import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import logging

load_dotenv()

from src.db import supabase, supabase_storage
from fastapi.middleware.cors import CORSMiddleware
from src.monitoring import performance_middleware, start_monitoring
from src.exceptions import ClaimWiseError, claimwise_exception_handler

from src.routes.monitoring import router as monitoring_router
from src.routes.policies import router as policies_router
from src.routes.analysis import router as analysis_router
from src.routes.chat import router as chat_router
from src.routes.dashboard import router as dashboard_router
from src.routes.admin import router as admin_router
from src.routes.auth import router as auth_router

logging.basicConfig(level=logging.INFO)

REQUEST_TIMEOUT_SECONDS = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "120"))

app = FastAPI()
app.add_exception_handler(ClaimWiseError, claimwise_exception_handler)

frontend_url = os.getenv("FRONTEND_URL", "https://claimwise-fht9.vercel.app")
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
]
if frontend_url:
    origins.append(frontend_url)
origins = list(set([url for url in origins if url]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def timeout_middleware(request: Request, call_next):
    try:
        response = await asyncio.wait_for(
            call_next(request), timeout=REQUEST_TIMEOUT_SECONDS
        )
        return response
    except asyncio.TimeoutError:
        logging.error("Request timeout on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=504,
            content={"detail": "Request timed out. Please try again."},
        )


app.middleware("http")(timeout_middleware)
app.middleware("http")(performance_middleware())

app.include_router(monitoring_router)
app.include_router(policies_router)
app.include_router(analysis_router)
app.include_router(chat_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(auth_router)


@app.on_event("startup")
async def startup_monitoring() -> None:
    start_monitoring()
