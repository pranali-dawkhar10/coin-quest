from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_cases():
    return [{"id": 1, "title": "Case 1"}]