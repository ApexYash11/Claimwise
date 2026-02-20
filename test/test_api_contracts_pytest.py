import sys
from pathlib import Path
import importlib

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

models_module = importlib.import_module("src.models")
document_validator_module = importlib.import_module("src.document_validator")
rate_limiting_module = importlib.import_module("src.rate_limiting")

CompareRequest = models_module.CompareRequest
MultiPolicyChatRequest = models_module.MultiPolicyChatRequest
ValidationResult = document_validator_module.ValidationResult
validate_insurance_document = document_validator_module.validate_insurance_document
RateLimitManager = rate_limiting_module.RateLimitManager
RateLimitConfig = rate_limiting_module.RateLimitConfig
RateLimitStrategy = rate_limiting_module.RateLimitStrategy
RateLimitScope = rate_limiting_module.RateLimitScope


def test_compare_request_requires_min_two_ids():
    with pytest.raises(Exception):
        CompareRequest(policy_ids=["only-one"])


def test_compare_request_enforces_max_ids():
    with pytest.raises(Exception):
        CompareRequest(policy_ids=[str(i) for i in range(11)])


def test_compare_request_accepts_valid_range():
    payload = CompareRequest(policy_ids=["a", "b", "c"])
    assert payload.policy_ids == ["a", "b", "c"]


def test_multi_policy_chat_requires_non_empty_question():
    with pytest.raises(Exception):
        MultiPolicyChatRequest(question="")


def test_multi_policy_chat_question_length_limit():
    with pytest.raises(Exception):
        MultiPolicyChatRequest(question="x" * 1001)


def test_document_validator_rejects_non_policy_text():
    non_policy_text = """
    Semester timetable for Data Structures and Algorithms.
    Lecture schedule, assignment submissions, and exam dates.
    Professor and classroom details.
    """
    report = validate_insurance_document(non_policy_text, "timetable.pdf")

    assert report.is_valid is False
    assert report.result in {
        ValidationResult.INVALID_NOT_POLICY,
        ValidationResult.INVALID_INSUFFICIENT_CONTENT,
    }


def test_document_validator_accepts_policy_like_text():
    policy_text = """
    Insurance Policy Document
    Policy Number: HLT-2026-123456
    Insurance Company: ClaimWise Health Insurance Ltd.
    Effective Date: 01/01/2026
    Premium Amount: 24000
    Coverage Amount: 500000
    """
    report = validate_insurance_document(policy_text, "health_policy.pdf")

    assert report.is_valid is True
    assert report.result in {ValidationResult.VALID_POLICY, ValidationResult.VALID_WITH_WARNINGS}


def test_rate_limiter_blocks_after_limit():
    manager = RateLimitManager()
    manager.add_limit(
        "test_limit",
        RateLimitConfig(
            max_requests=2,
            window_seconds=60,
            strategy=RateLimitStrategy.FIXED_WINDOW,
            scope=RateLimitScope.USER,
        ),
    )

    first = manager.check_rate_limit("test_limit", "user-1")
    second = manager.check_rate_limit("test_limit", "user-1")
    third = manager.check_rate_limit("test_limit", "user-1")

    assert first.allowed is True
    assert second.allowed is True
    assert third.allowed is False
    assert third.retry_after is not None
