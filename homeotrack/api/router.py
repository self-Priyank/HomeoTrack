from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from homeotrack.database.connection import get_db
from homeotrack.database.models import Rubric, Remedy
from homeotrack.core.ontology import CaseTotalityInput, CaseAnalysisResponse
from homeotrack.core.repertorizer import KentRepertorizer
from homeotrack.core.explanation import ClinicalExplanationBuilder
from homeotrack.services.materia_medica import MateriaMedicaService
from homeotrack.services.case_service import CaseService

router = APIRouter(prefix="/api")


@router.get("/rubrics/search")
def search_rubrics(
    q: str = Query(..., min_length=2, description="Search keyword for rubrics"),
    edition: Optional[str] = Query(None, description="Optional repertory edition filter"),
    limit: int = Query(25, le=100),
    db: Session = Depends(get_db),
):
    """Fast, indexed rubric auto-complete search."""
    keyword = f"%{q.strip()}%"
    query = db.query(Rubric).filter(
        or_(
            Rubric.fullpath.like(keyword),
            Rubric.textt.like(keyword)
        )
    )
    if edition:
        query = query.filter(Rubric.abbrev == edition)

    results = query.limit(limit).all()
    return [
        {
            "id": r.id,
            "rubric_id": r.rubric_id,
            "abbrev": r.abbrev,
            "chapterid": r.chapterid,
            "fullpath": r.fullpath or r.textt,
            "textt": r.textt,
        }
        for r in results
    ]


@router.post("/repertorize", response_model=CaseAnalysisResponse)
def repertorize_case(
    totality: CaseTotalityInput,
    limit: int = Query(25, le=50),
    db: Session = Depends(get_db),
):
    """Executes Kent's weighted symbolic repertorization over candidate remedies."""
    engine = KentRepertorizer(db)
    return engine.analyze_totality(totality, limit=limit)


@router.get("/remedies/{remedy_id}/explanation")
def get_remedy_explanation(
    remedy_id: int,
    totality: CaseTotalityInput,
    db: Session = Depends(get_db),
):
    """Generates detailed, traceable evidence explanation for a remedy."""
    engine = KentRepertorizer(db)
    analysis = engine.analyze_totality(totality, limit=100)
    for candidate in analysis.candidates:
        if candidate.remedy_id == remedy_id:
            return ClinicalExplanationBuilder.build_remedy_explanation(candidate)

    raise HTTPException(status_code=404, detail="Remedy candidate not found in analysis.")


@router.get("/materia-medica/{remedy_id}")
def get_materia_medica_profile(
    remedy_id: int,
    db: Session = Depends(get_db),
):
    """Fetches Materia Medica keynotes and chapters for a remedy."""
    service = MateriaMedicaService(db)
    profile = service.get_remedy_profile(remedy_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Materia Medica entry not found.")
    return profile


@router.post("/cases")
def create_case(
    totality: CaseTotalityInput,
    age: Optional[int] = None,
    gender: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Saves consultation case totality."""
    service = CaseService(db)
    case_obj = service.create_case(totality, age=age, gender=gender)
    return {"status": "success", "case_id": case_obj.id, "created_at": case_obj.created_at}


@router.get("/cases/{case_id}")
def get_case_details(
    case_id: int,
    db: Session = Depends(get_db),
):
    """Fetches full case details, symptoms, and prescription history."""
    service = CaseService(db)
    case_data = service.get_case(case_id)
    if not case_data:
        raise HTTPException(status_code=404, detail="Case not found.")
    return case_data
