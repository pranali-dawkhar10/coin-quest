from fastapi import APIRouter

router = APIRouter()

@router.post("/")
def query_copilot(payload: dict):
    return {"response": "AI processing complete"}