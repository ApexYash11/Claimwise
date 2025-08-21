
import sys
import os
import pytest
from fastapi.testclient import TestClient
src_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../src'))
if src_root not in sys.path:
    sys.path.insert(0, src_root)
os.environ['PYTHONPATH'] = src_root + os.pathsep + os.environ.get('PYTHONPATH', '')
from src.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "ClaimWise Backend"
