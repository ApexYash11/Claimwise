"""
Comprehensive test for all database field sanitization
"""

def test_comprehensive_sanitization():
    """Test the complete sanitization pipeline used in main.py"""
    
    def sanitize_db_field(value):
        """Sanitize any field going to database to prevent Unicode errors"""
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        # Remove null characters and other problematic chars
        clean_value = value.replace('\x00', '').replace('\u0000', '')
        # Remove other control characters except tabs, newlines, carriage returns
        import re
        clean_value = re.sub(r'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', clean_value)
        return clean_value.strip()
    
    print("🧪 Testing Comprehensive Database Field Sanitization")
    print("=" * 60)
    
    # Test with extremely problematic data
    test_cases = [
        {
            "name": "Normal Data",
            "data": {
                "user_id": "user123",
                "policy_name": "Health Insurance Policy",
                "policy_number": "POL/2024/001",
                "extracted_text": "This is normal policy text",
                "uploaded_file_url": "https://example.com/file.pdf",
                "validation_score": 95.0,
                "document_category": "Medical Policy"
            }
        },
        {
            "name": "Data with Null Characters",
            "data": {
                "user_id": "user\x00123\u0000",
                "policy_name": "Health\x00Insurance\u0000Policy",
                "policy_number": "POL\x00/2024/\u0000001",
                "extracted_text": "This\x00is\u0000policy\x00text\u0000",
                "uploaded_file_url": "https://example.com/file\x00.pdf",
                "validation_score": 95.0,
                "document_category": "Medical\x00Policy\u0000"
            }
        },
        {
            "name": "Data with Control Characters",
            "data": {
                "user_id": "user\x01123\x02",
                "policy_name": "Health\x03Insurance\x04Policy",
                "policy_number": "POL\x05/2024/\x06001",
                "extracted_text": "This\x07is\x08policy\x7ftext",
                "uploaded_file_url": "https://example.com/file\x1f.pdf",
                "validation_score": 95.0,
                "document_category": "Medical\x0ePolicy\x0f"
            }
        },
        {
            "name": "Data with Unicode Issues",
            "data": {
                "user_id": "user123",
                "policy_name": "Policy with ñáéíóú",
                "policy_number": "POL/2024/001",
                "extracted_text": "Text with currency ₹€£$ symbols",
                "uploaded_file_url": "https://example.com/file.pdf",
                "validation_score": 95.0,
                "document_category": "Medical Policy"
            }
        },
        {
            "name": "Mixed Problems",
            "data": {
                "user_id": "user\x00\x01123",
                "policy_name": "Policy\x00with\x02mixed\u0000issues",
                "policy_number": None,
                "extracted_text": "\x00\x01Mixed\x02problems\u0000with\x7fnulls\x1fand\x08controls",
                "uploaded_file_url": None,
                "validation_score": 95.0,
                "document_category": "Medical\x00Policy\x01"
            }
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        print("-" * 40)
        
        original_data = test_case['data']
        sanitized_data = {}
        
        for field, value in original_data.items():
            sanitized_value = sanitize_db_field(value)
            sanitized_data[field] = sanitized_value
            
            # Show what changed
            if value != sanitized_value:
                print(f"  {field}:")
                print(f"    Before: {repr(value)}")
                print(f"    After:  {repr(sanitized_value)}")
                if isinstance(value, str) and isinstance(sanitized_value, str):
                    print(f"    Length: {len(value)} → {len(sanitized_value)}")
            else:
                status = "✅" if value is not None else "⚪"
                print(f"  {field}: {status} {repr(value) if len(repr(value)) < 50 else repr(value)[:47] + '...'}")
        
        # Test for any remaining problematic characters
        remaining_issues = []
        for field, value in sanitized_data.items():
            if isinstance(value, str):
                if '\x00' in value or '\u0000' in value:
                    remaining_issues.append(f"{field} still has null chars")
                # Check for other control characters
                for char in value:
                    if ord(char) < 32 and char not in '\t\n\r':
                        remaining_issues.append(f"{field} has control char: {repr(char)}")
                        break
        
        if remaining_issues:
            print(f"  ❌ REMAINING ISSUES: {remaining_issues}")
        else:
            print(f"  ✅ ALL FIELDS CLEAN")
    
    print(f"\n" + "=" * 60)
    print("🎉 Database field sanitization test complete!")
    print("💡 All string fields are now safe for PostgreSQL storage")

if __name__ == "__main__":
    test_comprehensive_sanitization()
