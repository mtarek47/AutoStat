from fastapi import APIRouter, UploadFile, File
import uuid

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    dataset_id = str(uuid.uuid4())
    return {
        "dataset_id": dataset_id,
        "filename": file.filename,
        "content_type": file.content_type,
        "status": "UPLOADED"
    }
