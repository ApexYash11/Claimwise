#!/usr/bin/env python3
"""
ClaimWise Backend Startup Script
"""
import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    
    # Import the app
    from src.main import app
    
    # Run the server
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[backend_dir]
    )
