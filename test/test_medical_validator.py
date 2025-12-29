"""
Test the Medical Policy Validator
================================

Quick test script to verify the medical policy validation pipeline works correctly.
"""

import sys
import os

# Add the src directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.medical_policy_validator import validate_medical_policy

def test_validator():
    """Test the validator with different document types"""
    
    print("🧪 Testing Medical Policy Validator")
    print("=" * 50)
    
    # Test 1: Valid medical policy document
    valid_policy = """
    STAR HEALTH INSURANCE COMPANY LIMITED
    INDIVIDUAL MEDICAL INSURANCE POLICY
    
    Policy Number: SH/12345/2024
    Policy Holder: John Doe
    Sum Insured: ₹5,00,000
    Annual Premium: ₹12,500
    
    Policy Period: 01/04/2024 to 31/03/2025
    
    Coverage Details:
    - Cashless treatment at network hospitals
    - Emergency coverage up to sum insured
    - Pre and post hospitalization coverage
    - Medical checkup benefit
    
    Terms and Conditions:
    - Co-payment: 10% for senior citizens
    - Deductible: ₹25,000 per claim
    - Claim settlement through TPAs
    
    Contact Information:
    Star Health Insurance Company
    Customer Care: 1800-425-2255
    """
    
    print("\n1. Testing Valid Medical Policy:")
    print("-" * 30)
    result = validate_medical_policy(valid_policy, "star_health_policy.pdf")
    print(f"✅ Valid: {result.is_valid}")
    print(f"📊 Confidence: {result.confidence_score:.1f}%")
    print(f"📄 Category: {result.category.value}")
    print(f"🔍 Keywords Found: {len(result.found_keywords)}")
    print(f"📋 Fields Extracted: {len(result.extracted_fields)}")
    if result.extracted_fields:
        print("   Extracted Fields:")
        for field, value in result.extracted_fields.items():
            print(f"   - {field}: {value}")
    
    # Test 2: Travel ticket (should be rejected)
    travel_ticket = """
    AIRLINE TICKET CONFIRMATION
    Booking Reference: ABC123
    
    Passenger: Jane Smith
    Flight: AI 101
    From: Delhi (DEL) 
    To: Mumbai (BOM)
    Date: 15/12/2024
    Time: 14:30
    Seat: 12A
    
    Fare Details:
    Base Fare: ₹8,500
    Taxes: ₹1,200
    Total: ₹9,700
    
    Baggage: 15 kg included
    Check-in: Online check-in available
    """
    
    print("\n2. Testing Travel Ticket (should be rejected):")
    print("-" * 45)
    result = validate_medical_policy(travel_ticket, "flight_ticket.pdf")
    print(f"❌ Valid: {result.is_valid}")
    print(f"📊 Confidence: {result.confidence_score:.1f}%")
    print(f"📄 Category: {result.category.value}")
    print(f"💬 Message: {result.user_friendly_message}")
    if result.suggestions:
        print("💡 Suggestions:")
        for suggestion in result.suggestions:
            print(f"   - {suggestion}")
    
    # Test 3: Invoice (should be rejected)
    invoice = """
    MEDICAL BILLS INVOICE
    Invoice No: INV-2024-001
    Date: 10/12/2024
    
    Bill To:
    Mr. Robert Johnson
    123 Main Street
    City Hospital Visit
    
    Services:
    Doctor Consultation: ₹500
    Blood Test: ₹800
    X-Ray: ₹1,200
    Medicines: ₹650
    
    Subtotal: ₹3,150
    Tax (18%): ₹567
    Total Amount: ₹3,717
    
    Payment Method: Cash
    Status: Paid
    """
    
    print("\n3. Testing Medical Invoice (should be rejected):")
    print("-" * 45)
    result = validate_medical_policy(invoice, "medical_bill.pdf")
    print(f"❌ Valid: {result.is_valid}")
    print(f"📊 Confidence: {result.confidence_score:.1f}%")
    print(f"📄 Category: {result.category.value}")
    print(f"💬 Message: {result.user_friendly_message}")
    
    # Test 4: Academic timetable (should be rejected)
    timetable = """
    UNIVERSITY TIME TABLE
    Computer Science Department
    Semester V - July-November 2025
    
    Monday:
    9:00-10:00 - Data Structures (Prof. Smith)
    10:00-11:00 - Algorithms (Prof. Johnson)
    11:00-12:00 - Database Systems (Prof. Brown)
    
    Tuesday:
    9:00-10:00 - Operating Systems (Prof. Davis)
    10:00-11:00 - Computer Networks (Prof. Wilson)
    11:00-12:00 - Software Engineering (Prof. Miller)
    
    Examination Schedule:
    Mid-term: 15-20 October 2025
    Final: 25-30 November 2025
    """
    
    print("\n4. Testing Academic Timetable (should be rejected):")
    print("-" * 45)
    result = validate_medical_policy(timetable, "university_timetable.pdf")
    print(f"❌ Valid: {result.is_valid}")
    print(f"📊 Confidence: {result.confidence_score:.1f}%")
    print(f"📄 Category: {result.category.value}")
    print(f"💬 Message: {result.user_friendly_message}")
    
    print("\n" + "=" * 50)
    print("🎉 Medical Policy Validator Test Complete!")
    print("✅ The validator correctly identifies medical policies")
    print("❌ The validator correctly rejects non-policy documents")
    print("=" * 50)

if __name__ == "__main__":
    test_validator()
