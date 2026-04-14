from fastapi import APIRouter, File, UploadFile

from app.services.recognition import RecognitionResult, recognize_plan_bytes


router = APIRouter(prefix="/recognition", tags=["recognition"])


@router.post("/plan", response_model=RecognitionResult)
async def recognize_plan_route(file: UploadFile = File(...)) -> RecognitionResult:
    return recognize_plan_bytes(await file.read())
