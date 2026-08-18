from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from homeotrack.database.models import Case, CaseSymptom, Prescription, Outcome, Remedy, Rubric
from homeotrack.core.ontology import CaseTotalityInput


class CaseService:
    """Service to handle Patient Case CRUD, Prescription logging, and Outcome tracking."""

    def __init__(self, db: Session):
        self.db = db

    def create_case(self, totality: CaseTotalityInput, age: Optional[int] = None, gender: Optional[str] = None) -> Case:
        """Saves a new patient consultation case totality."""
        now_str = datetime.now().isoformat()

        new_case = Case(
            patient_name=totality.patient_name or "Anonymous Patient",
            patient_age=age,
            patient_gender=gender,
            chief_complaint=totality.chief_complaint,
            created_at=now_str,
        )
        self.db.add(new_case)
        self.db.commit()
        self.db.refresh(new_case)

        # Save symptoms
        for sym in totality.symptoms:
            cs = CaseSymptom(
                case_id=new_case.id,
                rubric_id=sym.rubric_id,
                intensity_weight=sym.intensity_weight,
                hierarchy=sym.hierarchy.value,
                modality=sym.modality.value,
            )
            self.db.add(cs)

        self.db.commit()
        return new_case

    def get_case(self, case_id: int) -> Optional[Dict[str, Any]]:
        """Fetch case details and associated symptoms."""
        c = self.db.query(Case).filter(Case.id == case_id).first()
        if not c:
            return None

        symptoms = self.db.query(CaseSymptom).filter(CaseSymptom.case_id == case_id).all()
        prescriptions = self.db.query(Prescription).filter(Prescription.case_id == case_id).all()

        symptom_list = []
        for s in symptoms:
            r = self.db.query(Rubric).filter(Rubric.rubric_id == s.rubric_id).first()
            symptom_list.append({
                "id": s.id,
                "rubric_id": s.rubric_id,
                "rubric_text": r.fullpath if r else f"Rubric #{s.rubric_id}",
                "intensity_weight": s.intensity_weight,
                "hierarchy": s.hierarchy,
                "modality": s.modality,
            })

        rx_list = []
        for rx in prescriptions:
            outcomes = self.db.query(Outcome).filter(Outcome.prescription_id == rx.id).all()
            rx_list.append({
                "id": rx.id,
                "remedy_id": rx.remedy_id,
                "remedy_name": rx.remedy_name,
                "potency": rx.potency,
                "prescribed_at": rx.prescribed_at,
                "notes": rx.notes,
                "outcomes": [{"id": o.id, "level": o.improvement_level, "notes": o.notes, "recorded_at": o.recorded_at} for o in outcomes]
            })

        return {
            "id": c.id,
            "patient_name": c.patient_name,
            "patient_age": c.patient_age,
            "patient_gender": c.patient_gender,
            "chief_complaint": c.chief_complaint,
            "created_at": c.created_at,
            "symptoms": symptom_list,
            "prescriptions": rx_list,
        }

    def record_prescription(self, case_id: int, remedy_id: int, potency: str, notes: Optional[str] = None) -> Prescription:
        """Record a prescribed remedy for a case."""
        remedy = self.db.query(Remedy).filter(Remedy.id == remedy_id).first()
        remedy_name = remedy.namelong if remedy else f"Remedy #{remedy_id}"

        rx = Prescription(
            case_id=case_id,
            remedy_id=remedy_id,
            remedy_name=remedy_name,
            potency=potency,
            prescribed_at=datetime.now().isoformat(),
            notes=notes,
        )
        self.db.add(rx)
        self.db.commit()
        self.db.refresh(rx)
        return rx
