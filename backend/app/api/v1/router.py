from fastapi import APIRouter
from app.api.v1.endpoints import ai_copilot, auth, cases, trace

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(ai_copilot.router, prefix="/ai_copilot", tags=["ai_copilot"])
api_router.include_router(trace.router, prefix="/trace", tags=["trace"])