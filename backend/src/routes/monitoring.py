from fastapi import APIRouter, Depends
from src.auth import get_current_user
from src.monitoring import monitor, get_health_status

router = APIRouter()


@router.get("/")
def root():
    return {"message": "ClaimWise Backend"}


@router.get("/healthz")
def healthz():
    return {"status": "ok"}


@router.get("/monitoring/summary")
def monitoring_summary(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_admin_user

    _require_admin_user(user_id)
    return monitor.get_performance_summary()


@router.get("/monitoring/endpoints")
def monitoring_endpoints(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_admin_user

    _require_admin_user(user_id)
    return monitor.get_endpoint_stats()


@router.get("/monitoring/health")
async def monitoring_health(user_id: str = Depends(get_current_user)):
    from src.main_app import _require_admin_user

    _require_admin_user(user_id)
    return await get_health_status()
