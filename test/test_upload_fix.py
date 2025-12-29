"""
Test upload with potentially problematic text to verify the Unicode fix
"""

import requests
import json

def test_upload_with_sanitized_text():
    """Test upload endpoint with text that might cause Unicode issues"""
    
    # Sample policy text that could have Unicode issues in real scenarios
    policy_text = """
    COMPREHENSIVE MEDICAL INSURANCE POLICY
    
    Policy Number: MED/2024/12345
    Insurance Company: National Health Insurance Ltd.
    
    Policy Holder Details:
    Name: John Smith
    Age: 35 years
    Address: 123 Health Street, Medical City
    
    Coverage Details:
    Sum Insured: ₹10,00,000 (Ten Lakh Rupees)
    Annual Premium: ₹25,000 (Twenty Five Thousand Rupees)
    Policy Period: 01/01/2024 to 31/12/2024
    
    Benefits Covered:
    - Hospitalization expenses up to sum insured
    - Pre and post hospitalization coverage (30 days each)
    - Ambulance charges up to ₹2,000 per incident  
    - Cashless treatment at network hospitals
    - Medical checkup benefit annually
    
    Terms and Conditions:
    - Deductible: ₹25,000 per claim
    - Co-payment: 10% for treatments above ₹50,000
    - Claim settlement through Third Party Administrator
    - Policy valid till expiry date mentioned above
    
    Contact Information:
    Customer Care: 1800-123-4567
    Claims Helpline: 1800-765-4321
    Website: www.nationalhealthinsurance.com
    """
    
    print("🧪 Testing Upload API with Policy Text")
    print("=" * 50)
    
    # API endpoint (assuming your server is running on localhost:8000)
    url = "http://localhost:8000/upload-policy"
    
    # Test data
    data = {
        "text_input": policy_text,
        "policy_name": "Test Medical Policy",
        "policy_number": "MED/2024/12345",
        "sync_indexing": False
    }
    
    # Add a dummy user_id header (you'll need to adjust based on your auth system)
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-user-token"  # Adjust as needed
    }
    
    try:
        print(f"📤 Sending request to: {url}")
        print(f"📝 Policy text length: {len(policy_text)} characters")
        
        # Make the request
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        print(f"📥 Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"📄 Policy ID: {result.get('policy_id', 'N/A')}")
            print(f"📊 Status: {result.get('status', 'N/A')}")
            print(f"🔍 Text extracted: {len(result.get('extracted_text', '')) > 0}")
            
        elif response.status_code == 422:
            # Validation error (expected for some test cases)
            error_detail = response.json().get('detail', {})
            print("❌ Validation failed (expected):")
            print(f"   Error: {error_detail.get('error_type', 'Unknown')}")
            print(f"   Message: {error_detail.get('message', 'No message')}")
            
        else:
            print(f"❌ Upload failed: {response.status_code}")
            try:
                error_detail = response.json()
                print(f"   Error details: {json.dumps(error_detail, indent=2)}")
            except:
                print(f"   Error text: {response.text}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        print("💡 Make sure your backend server is running on localhost:8000")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Upload test complete!")

if __name__ == "__main__":
    test_upload_with_sanitized_text()
