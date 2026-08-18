import time
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from homeotrack.database.models import Rubric, Remedy, RubricRemedy
from homeotrack.core.ontology import (
    CaseTotalityInput,
    RemedyRankResult,
    RubricMatchDetail,
    CaseAnalysisResponse,
)


class KentRepertorizer:
    """Kent-style weighted symbolic repertorization engine."""

    def __init__(self, db: Session):
        self.db = db

    def analyze_totality(self, totality: CaseTotalityInput, limit: int = 25) -> CaseAnalysisResponse:
        """Runs Kent's weighted repertorization algorithm over patient symptom totality."""
        start_time = time.time()
        symptoms = totality.symptoms

        if not symptoms:
            return CaseAnalysisResponse(
                patient_name=totality.patient_name,
                chief_complaint=totality.chief_complaint,
                total_symptoms_analyzed=0,
                candidates=[],
            )

        # Map input symptoms by primary key rubric_id
        input_symptom_map = {s.rubric_id: s for s in symptoms}
        primary_ids = list(input_symptom_map.keys())

        # 1. Fetch exact Rubric records by primary key `id` OR `rubric_id`
        selected_rubrics = self.db.query(Rubric).filter(
            or_(
                Rubric.id.in_(primary_ids),
                Rubric.rubric_id.in_(primary_ids)
            )
        ).all()

        if not selected_rubrics:
            return CaseAnalysisResponse(
                patient_name=totality.patient_name,
                chief_complaint=totality.chief_complaint,
                total_symptoms_analyzed=len(symptoms),
                candidates=[],
            )

        # Build conditions for RubricRemedy lookup (edition abbrev + rubric_id)
        rubric_lookup = {}
        rr_conditions = []

        for r in selected_rubrics:
            key = (r.abbrev, r.rubric_id)
            rubric_lookup[key] = r
            # Also map input symptom by either r.id or r.rubric_id
            sym = input_symptom_map.get(r.id) or input_symptom_map.get(r.rubric_id)
            if sym:
                rubric_lookup[key + ('symptom',)] = sym

            rr_conditions.append(
                and_(RubricRemedy.abbrev == r.abbrev, RubricRemedy.rubricid == r.rubric_id)
            )

        # 2. Fetch all rubric-remedy matrix links
        rr_links = (
            self.db.query(RubricRemedy)
            .filter(or_(*rr_conditions))
            .all()
        )

        if not rr_links:
            return CaseAnalysisResponse(
                patient_name=totality.patient_name,
                chief_complaint=totality.chief_complaint,
                total_symptoms_analyzed=len(selected_rubrics),
                candidates=[],
            )

        # Unique remedy IDs
        remedy_ids = list({rr.remedyid for rr in rr_links})

        # 3. Fetch Remedy master records
        remedies = self.db.query(Remedy).filter(Remedy.id.in_(remedy_ids)).all()
        remedy_map = {rem.id: rem for rem in remedies}

        # 4. Compute weighted scores per remedy
        remedy_scores = {}

        for rr in rr_links:
            remedy_id = rr.remedyid
            key = (rr.abbrev, rr.rubricid)
            rubric = rubric_lookup.get(key)
            symptom = rubric_lookup.get(key + ('symptom',))

            if not rubric or remedy_id not in remedy_map:
                continue

            remedy = remedy_map[remedy_id]
            remedy_degree = rr.weight  # 1st, 2nd, 3rd, 4th degree
            intensity_weight = symptom.intensity_weight if symptom else 1
            hierarchy_mult = symptom.hierarchy.multiplier if symptom else 1.0
            modality_mult = symptom.modality.multiplier if symptom else 1.0

            # Kent's weighted calculation: Degree * Intensity * Hierarchy * Modality
            weighted_score = (
                remedy_degree
                * intensity_weight
                * hierarchy_mult
                * modality_mult
            )

            match_detail = RubricMatchDetail(
                rubric_id=rubric.id,
                rubric_text=rubric.fullpath or rubric.textt or f"Rubric #{rubric.rubric_id}",
                remedy_degree=remedy_degree,
                symptom_weight=intensity_weight,
                hierarchy=symptom.hierarchy if symptom else "particular",
                modality=symptom.modality if symptom else "none",
                weighted_score=round(weighted_score, 2),
            )

            if remedy_id not in remedy_scores:
                remedy_scores[remedy_id] = {
                    "remedy": remedy,
                    "total_score": 0.0,
                    "matched_details": [],
                }

            remedy_scores[remedy_id]["total_score"] += weighted_score
            remedy_scores[remedy_id]["matched_details"].append(match_detail)

        # 5. Build candidate ranking list
        candidates = []
        total_symptoms_count = len(selected_rubrics)

        for remedy_id, data in remedy_scores.items():
            rem = data["remedy"]
            matched_count = len(data["matched_details"])
            coverage_pct = round((matched_count / total_symptoms_count) * 100.0, 1)

            candidates.append(
                RemedyRankResult(
                    remedy_id=rem.id,
                    nameabbrev=rem.nameabbrev,
                    namelong=rem.namelong,
                    total_score=round(data["total_score"], 2),
                    matched_rubrics_count=matched_count,
                    total_rubrics_count=total_symptoms_count,
                    coverage_pct=coverage_pct,
                    matched_details=data["matched_details"],
                )
            )

        # Sort candidate remedies: Primary by matched_rubrics_count DESC, Secondary by total_score DESC
        candidates.sort(
            key=lambda c: (c.matched_rubrics_count, c.total_score), reverse=True
        )

        elapsed_ms = (time.time() - start_time) * 1000
        print(f"[Repertorizer Engine] Repertorization over {total_symptoms_count} rubrics completed in {elapsed_ms:.2f}ms! Candidates found: {len(candidates)}")

        return CaseAnalysisResponse(
            patient_name=totality.patient_name,
            chief_complaint=totality.chief_complaint,
            total_symptoms_analyzed=total_symptoms_count,
            candidates=candidates[:limit],
        )
