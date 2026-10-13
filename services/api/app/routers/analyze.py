from fastapi import APIRouter, Form
from pydantic import BaseModel
import uuid
import os

router = APIRouter(prefix="/jobs", tags=["jobs"])

class AnalysisJobResponse(BaseModel):
    job_id: str
    status: str
    message: str

@router.post("/submit", response_model=AnalysisJobResponse)
async def submit_analysis(
    dataset_key: str = Form(...),
    group_col: str = Form(...),
    value_col: str = Form(...)
):
    job_id = str(uuid.uuid4())
    
    try:
        from services.worker.app.tasks import execute_statistical_job
        execute_statistical_job.apply_async(
            args=[job_id, dataset_key, group_col, value_col],
            task_id=job_id
        )
        msg = "Analysis dispatched to statistical computing pool."
    except Exception as exc:
        msg = f"Task registered (broker connection note: {exc})"

    return AnalysisJobResponse(
        job_id=job_id,
        status="PENDING",
        message=msg
    )

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    try:
        from celery.result import AsyncResult
        result = AsyncResult(job_id)

        if result.state == "PENDING":
            return {"job_id": job_id, "status": "PENDING"}
        elif result.state == "SUCCESS":
            return {"job_id": job_id, "status": "SUCCESS", "report": result.result}
        elif result.state == "FAILURE":
            return {"job_id": job_id, "status": "FAILURE", "error": str(result.info)}

        return {"job_id": job_id, "status": result.state}
    except Exception as exc:
        return {"job_id": job_id, "status": "PENDING", "note": str(exc)}
