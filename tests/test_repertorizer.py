import time
import pytest
from homeotrack.database.connection import SessionLocal, init_db
from homeotrack.database.models import Rubric, Remedy, RubricRemedy
from homeotrack.core.ontology import (
    CaseTotalityInput,
    CaseSymptomInput,
    SymptomHierarchy,
    ModalityType,
)
from homeotrack.core.repertorizer import KentRepertorizer
from homeotrack.core.explanation import ClinicalExplanationBuilder


@pytest.fixture(scope="module")
def setup_db():
    """Ensure database connection fixture."""
    init_db()
    db = SessionLocal()
    yield db
    db.close()


def test_repertorizer_benchmark_case(setup_db):
    """Test Kent-style weighted repertorization against benchmark symptoms."""
    db = setup_db

    # Search sample rubrics from database
    r1 = db.query(Rubric).filter(Rubric.fullpath.like("%abscess%")).first()
    r2 = db.query(Rubric).filter(Rubric.fullpath.like("%stomach%")).first()

    assert r1 is not None, "Rubric 'abscess' not found."
    assert r2 is not None, "Rubric 'stomach' not found."

    totality = CaseTotalityInput(
        patient_name="Benchmark Test Patient",
        chief_complaint="Abscess with stomach symptoms",
        symptoms=[
            CaseSymptomInput(
                rubric_id=r1.rubric_id,
                rubric_text=r1.fullpath,
                intensity_weight=3,
                hierarchy=SymptomHierarchy.MENTAL_GENERAL,
                modality=ModalityType.AGGRAVATION,
            ),
            CaseSymptomInput(
                rubric_id=r2.rubric_id,
                rubric_text=r2.fullpath,
                intensity_weight=2,
                hierarchy=SymptomHierarchy.PHYSICAL_GENERAL,
                modality=ModalityType.NONE,
            ),
        ],
    )

    engine = KentRepertorizer(db)
    start = time.time()
    analysis = engine.analyze_totality(totality, limit=20)
    elapsed_ms = (time.time() - start) * 1000

    print(f"\n[Repertorization Benchmark Test]")
    print(f"  Analyzed Symptoms: {analysis.total_symptoms_analyzed}")
    print(f"  Candidate Remedies Found: {len(analysis.candidates)}")
    print(f"  Calculation Time: {elapsed_ms:.2f}ms")

    assert len(analysis.candidates) > 0, "No candidate remedies found for totality."
    assert elapsed_ms < 100.0, f"Repertorization took {elapsed_ms:.2f}ms (expected <100ms)."

    top_candidate = analysis.candidates[0]
    assert top_candidate.total_score > 0
    assert top_candidate.matched_rubrics_count > 0
    assert len(top_candidate.matched_details) > 0

    print(f"  Top Candidate: {top_candidate.namelong} ({top_candidate.nameabbrev}) | Score: {top_candidate.total_score} | Coverage: {top_candidate.coverage_pct}%")


def test_clinical_explanation_builder(setup_db):
    """Test clinical explanation builder formatting."""
    db = setup_db
    r1 = db.query(Rubric).first()

    totality = CaseTotalityInput(
        symptoms=[
            CaseSymptomInput(
                rubric_id=r1.rubric_id,
                rubric_text=r1.fullpath,
                intensity_weight=2,
                hierarchy=SymptomHierarchy.MENTAL_GENERAL,
            )
        ]
    )

    engine = KentRepertorizer(db)
    analysis = engine.analyze_totality(totality, limit=5)

    if analysis.candidates:
        candidate = analysis.candidates[0]
        explanation = ClinicalExplanationBuilder.build_remedy_explanation(candidate)

        assert explanation["remedy_id"] == candidate.remedy_id
        assert "namelong" in explanation
        assert "summary_rationale" in explanation
        assert candidate.namelong in explanation["summary_rationale"]
        print(f"\n[Explanation Test] Grounded Rationale Preview:\n{explanation['summary_rationale']}")
