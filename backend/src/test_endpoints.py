def test_real_medical_policies():
    # Policy 1: MediCare Plus
    policy1_text = '''Policy Name: MediCare Plus\nPolicy Number: MC-45821\nInsured Person: Rahul Sharma\nCoverage Amount: ₹10,00,000\nAnnual Premium: ₹12,000\nPolicy Term: 1 Year (Renewable)\n\nInclusions\nHospitalization expenses (room rent up to ₹5,000/day)\nPre-hospitalization (30 days) & Post-hospitalization (60 days)\nDaycare procedures (up to 150 listed treatments)\nAmbulance cover (₹2,000 per event)\nFree annual health check-up\n\nExclusions\nCosmetic surgery\nPre-existing diseases for first 3 years\nMaternity and childbirth (waiting period 36 months)\nDental & vision care (non-accidental)'''
    data1 = {
        "policy_name": "MediCare Plus",
        "policy_number": "MC-45821",
        "text_input": policy1_text
    }
    resp1 = client.post("/upload-policy", data=data1, headers=auth_headers())
    assert resp1.status_code == 200, resp1.text
    id1 = resp1.json()["policy_id"]

    # Policy 2: HealthSecure Premium
    policy2_text = '''Policy Name: HealthSecure Premium\nPolicy Number: HS-78294\nInsured Person: Rahul Sharma\nCoverage Amount: ₹15,00,000\nAnnual Premium: ₹16,500\nPolicy Term: 1 Year (Renewable)\n\nInclusions\nHospitalization expenses (room rent up to ₹7,000/day)\nPre-hospitalization (60 days) & Post-hospitalization (90 days)\nDaycare procedures (200 listed treatments)\nAmbulance cover (₹3,000 per event)\nCritical illness cover (₹3,00,000 sub-limit)\nAnnual health check-up + wellness benefits\n\nExclusions\nCosmetic surgery\nPre-existing diseases for first 2 years\nMaternity (waiting period 24 months)\nAlternative therapies (unless approved)'''
    data2 = {
        "policy_name": "HealthSecure Premium",
        "policy_number": "HS-78294",
        "text_input": policy2_text
    }
    resp2 = client.post("/upload-policy", data=data2, headers=auth_headers())
    assert resp2.status_code == 200, resp2.text
    id2 = resp2.json()["policy_id"]

    # Analyze Policy 1
    params1 = {"policy_id": id1}
    analysis1 = client.post("/analyze-policy", params=params1, headers=auth_headers())
    assert analysis1.status_code == 200, analysis1.text
    print("Analysis for MediCare Plus:", analysis1.json())

    # Analyze Policy 2
    params2 = {"policy_id": id2}
    analysis2 = client.post("/analyze-policy", params=params2, headers=auth_headers())
    assert analysis2.status_code == 200, analysis2.text
    print("Analysis for HealthSecure Premium:", analysis2.json())

    # Compare the two policies
    params_compare = {"policy_1_id": id1, "policy_2_id": id2}
    comparison = client.post("/compare-policies", params=params_compare, headers=auth_headers())
    assert comparison.status_code == 200, comparison.text
    print("Comparison result:", comparison.json())
import pytest
from fastapi.testclient import TestClient
from src.main import app
import io

# User details
USER_ID = "89e18d07-47a7-45fc-8969-e94e0938c77e"
JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsImtpZCI6Ikp3NXN2a3N4MStKUlRYWU8iLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3Btc29vZWJkZGFlZGRqeWFiZ2h3LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI4OWUxOGQwNy00N2E3LTQ1ZmMtODk2OS1lOTRlMDkzOGM3N2UiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU1ODEyNTk5LCJpYXQiOjE3NTU4MDg5OTksImVtYWlsIjoidGVzdHVzZXJfY2xhaW13aXNlQGV4YW1wbGUuY29tIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnsicHJvdmlkZXIiOiJlbWFpbCIsInByb3ZpZGVycyI6WyJlbWFpbCJdfSwidXNlcl9tZXRhZGF0YSI6eyJlbWFpbF92ZXJpZmllZCI6dHJ1ZX0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTU4MDg5OTl9XSwic2Vzc2lvbl9pZCI6ImRlODgxZjA4LTIxN2ItNDRjYy1hMjMzLTc1YmVjMWU1YTdiYiIsImlzX2Fub255bW91cyI6ZmFsc2V9.YvWOnRi8gUqxYD5MrNRU2_07FAUH129mA5QWptDJ2LI"

client = TestClient(app)

def auth_headers():
    return {"Authorization": f"Bearer {JWT_TOKEN}"}

def test_root():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["message"] == "ClaimWise Backend"

def test_upload_policy():
    # Upload a sample text policy
    data = {
        "policy_name": "Test Policy",
        "policy_number": "TP-123",
        "text_input": "This is a test insurance policy for automated testing."
    }
    resp = client.post("/upload-policy", data=data, headers=auth_headers())
    assert resp.status_code == 200, resp.text
    result = resp.json()
    assert "policy_id" in result
    global POLICY_ID
    POLICY_ID = result["policy_id"]
    return POLICY_ID

def test_analyze_policy():
    policy_id = test_upload_policy()
    params = {"policy_id": policy_id}
    resp = client.post("/analyze-policy", params=params, headers=auth_headers())
    assert resp.status_code == 200, resp.text
    assert "analysis" in resp.json()

def test_history():
    resp = client.get("/history", headers=auth_headers())
    assert resp.status_code == 200, resp.text
    assert "policies" in resp.json()

def test_chat():
    policy_id = test_upload_policy()
    params = {"policy_id": policy_id, "question": "What is covered?"}
    resp = client.post("/chat", params=params, headers=auth_headers())
    assert resp.status_code == 200, resp.text
    assert "answer" in resp.json()

def test_compare_policies():
    # Upload two policies
    data1 = {
        "policy_name": "Policy 1",
        "policy_number": "P1-001",
        "text_input": "Policy one text."
    }
    data2 = {
        "policy_name": "Policy 2",
        "policy_number": "P2-002",
        "text_input": "Policy two text."
    }
    resp1 = client.post("/upload-policy", data=data1, headers=auth_headers())
    resp2 = client.post("/upload-policy", data=data2, headers=auth_headers())
    assert resp1.status_code == 200 and resp2.status_code == 200
    id1 = resp1.json()["policy_id"]
    id2 = resp2.json()["policy_id"]
    params = {"policy_1_id": id1, "policy_2_id": id2}
    resp = client.post("/compare-policies", params=params, headers=auth_headers())
    assert resp.status_code == 200, resp.text
    assert "comparison" in resp.json()

def test_refresh_token():
    # This test is a placeholder; you need a valid refresh token to test this endpoint
    pass
