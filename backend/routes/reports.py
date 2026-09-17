"""Reports API."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy.orm import Session

from database import get_db
from models import AnomalyReport
from schemas import ReportGenerateRequest, ReportOut
from services.report_service import generate_report
from utils.export_utils import dicts_to_csv, flatten_report_for_csv, to_json

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=list[ReportOut])
def list_reports(db: Session = Depends(get_db)):
    return db.query(AnomalyReport).order_by(AnomalyReport.created_at.desc()).all()


@router.post("/generate", response_model=ReportOut)
async def create_report(payload: ReportGenerateRequest, db: Session = Depends(get_db)):
    return await generate_report(db, payload.report_type, payload.title)


@router.get("/{report_pk}", response_model=ReportOut)
def get_report(report_pk: int, db: Session = Depends(get_db)):
    report = db.query(AnomalyReport).filter(AnomalyReport.id == report_pk).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_pk}/export-csv")
def export_csv(report_pk: int, db: Session = Depends(get_db)):
    report = db.query(AnomalyReport).filter(AnomalyReport.id == report_pk).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    rows = flatten_report_for_csv(report.data or {})
    csv_text = dicts_to_csv(rows) if rows else "section,value\nsummary," + (report.summary or "")
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report.report_id}.csv"'},
    )


@router.get("/{report_pk}/export-json")
def export_json(report_pk: int, db: Session = Depends(get_db)):
    report = db.query(AnomalyReport).filter(AnomalyReport.id == report_pk).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    payload = {
        "report_id": report.report_id,
        "title": report.title,
        "summary": report.summary,
        "executive_summary": report.executive_summary,
        "data": report.data,
        "created_at": report.created_at,
    }
    return PlainTextResponse(
        content=to_json(payload),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{report.report_id}.json"'},
    )
