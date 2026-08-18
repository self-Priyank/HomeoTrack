from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class SymptomHierarchy(str, Enum):
    MENTAL_GENERAL = "mental_general"
    PHYSICAL_GENERAL = "physical_general"
    PARTICULAR = "particular"

    @property
    def multiplier(self) -> float:
        """Kent's symptom hierarchy weighting multiplier."""
        if self == SymptomHierarchy.MENTAL_GENERAL:
            return 2.0
        elif self == SymptomHierarchy.PHYSICAL_GENERAL:
            return 1.5
        return 1.0


class ModalityType(str, Enum):
    AGGRAVATION = "aggravation"
    AMELIORATION = "amelioration"
    NONE = "none"

    @property
    def multiplier(self) -> float:
        """Modality weighting multiplier."""
        if self == ModalityType.AGGRAVATION:
            return 1.25
        elif self == ModalityType.AMELIORATION:
            return 0.85
        return 1.0


class CaseSymptomInput(BaseModel):
    """Structured symptom input entry from case intake."""
    rubric_id: int
    rubric_text: Optional[str] = None
    intensity_weight: int = Field(default=1, ge=1, le=4)  # Patient symptom intensity (1 to 4)
    hierarchy: SymptomHierarchy = SymptomHierarchy.PARTICULAR
    modality: ModalityType = ModalityType.NONE


class CaseTotalityInput(BaseModel):
    """Complete patient case symptom totality for repertorization."""
    patient_name: Optional[str] = "Anonymous Patient"
    chief_complaint: Optional[str] = None
    symptoms: List[CaseSymptomInput] = []


class RubricMatchDetail(BaseModel):
    """Detailed evidence match breakdown for a single rubric against a remedy."""
    rubric_id: int
    rubric_text: str
    remedy_degree: int  # Remedy degree in repertory (1st=1, 2nd=2, 3rd=3, 4th=4)
    symptom_weight: int  # Intensity weight assigned by clinician (1-4)
    hierarchy: SymptomHierarchy
    modality: ModalityType
    weighted_score: float  # Computed score contribution


class RemedyRankResult(BaseModel):
    """Ranked candidate remedy output with evidence traceability."""
    remedy_id: int
    nameabbrev: str
    namelong: str
    total_score: float
    matched_rubrics_count: int
    total_rubrics_count: int
    coverage_pct: float
    matched_details: List[RubricMatchDetail]
    materia_medica_summary: Optional[str] = None


class CaseAnalysisResponse(BaseModel):
    """Complete case analysis response payload."""
    case_id: Optional[int] = None
    patient_name: Optional[str] = None
    chief_complaint: Optional[str] = None
    total_symptoms_analyzed: int
    candidates: List[RemedyRankResult]
