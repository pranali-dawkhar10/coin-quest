from fastapi import APIRouter

router = APIRouter()

@router.post("/login")
def login():
    return {"access_token": "token_example", "token_type": "bearer"}