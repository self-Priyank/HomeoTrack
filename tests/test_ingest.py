import time
import pytest
from sqlalchemy import or_, text
from homeotrack.config import DATABASE_FILE, DATABASE_URL
from homeotrack.database.connection import SessionLocal, init_db
from homeotrack.database.models import Rubric, Remedy, RubricRemedy, MMInfo, MMChapter, MMSection, Info
from homeotrack.database.ingest_oorep import ingest_oorep_data


@pytest.fixture(scope="module")
def setup_database():
    """Ensure database exists and is populated before running ingestion tests."""
    init_db()
    db = SessionLocal()
    rubric_count = db.query(Rubric).count()
    if rubric_count < 140000:
        db.close()
        ingest_oorep_data()
    else:
        db.close()


def test_database_connection(setup_database):
    """Verify active database connection (PostgreSQL / SQLite)."""
    db = SessionLocal()
    try:
        res = db.execute(text("SELECT 1")).scalar()
        assert res == 1, "Database connectivity test failed."
    finally:
        db.close()


def test_table_record_counts(setup_database):
    """Verify exact expected record counts from oorep dataset."""
    db = SessionLocal()
    try:
        rubric_count = db.query(Rubric).count()
        remedy_count = db.query(Remedy).count()
        rr_count = db.query(RubricRemedy).count()
        mminfo_count = db.query(MMInfo).count()
        mmsection_count = db.query(MMSection).count()
        info_count = db.query(Info).count()

        print(f"\n[Phase 0 Verification Record Counts ({DATABASE_URL.split(':')[0]})]")
        print(f"  Info Records: {info_count}")
        print(f"  Rubrics: {rubric_count:,}")
        print(f"  Remedies: {remedy_count:,}")
        print(f"  Rubric-Remedy Links: {rr_count:,}")
        print(f"  MM Work Metadata: {mminfo_count}")
        print(f"  Materia Medica Sections: {mmsection_count:,}")

        assert info_count >= 2, f"Expected 2 info records, got {info_count}"
        assert rubric_count >= 140000, f"Expected ~143,408 rubrics, got {rubric_count}"
        assert remedy_count >= 2400, f"Expected ~2,432 remedies, got {remedy_count}"
        assert rr_count >= 1300000, f"Expected ~1,359,576 rubric-remedy links, got {rr_count}"
        assert mmsection_count >= 6000, f"Expected ~6,393 MM sections, got {mmsection_count}"
    finally:
        db.close()


def test_remedy_search_performance(setup_database):
    """Verify sub-50ms query latency for remedy lookups."""
    db = SessionLocal()
    try:
        start = time.time()
        remedy = db.query(Remedy).filter(Remedy.namelong.like("Nux Vomica%")).first()
        elapsed_ms = (time.time() - start) * 1000

        assert remedy is not None, "Remedy 'Nux Vomica' not found in database."
        assert remedy.nameabbrev.startswith("Nux"), f"Expected Nux abbreviation, got {remedy.nameabbrev}"
        assert elapsed_ms < 50.0, f"Remedy lookup took {elapsed_ms:.2f}ms (expected <50ms)"
        print(f"\n[Performance Test] Remedy lookup '{remedy.namelong}' ({remedy.nameabbrev}) took {elapsed_ms:.2f}ms")
    finally:
        db.close()


def test_rubric_search_performance(setup_database):
    """Verify query latency for indexed rubric keyword searches."""
    db = SessionLocal()
    try:
        start = time.time()
        rubrics = db.query(Rubric).filter(Rubric.fullpath.like("%abscess%")).limit(20).all()
        elapsed_ms = (time.time() - start) * 1000

        assert len(rubrics) > 0, "No rubrics found for keyword 'abscess'."
        assert elapsed_ms < 100.0, f"Rubric search took {elapsed_ms:.2f}ms (expected <100ms)"
        print(f"\n[Performance Test] Rubric search for 'abscess' returned {len(rubrics)} results in {elapsed_ms:.2f}ms")
    finally:
        db.close()


def test_rubric_remedy_mapping(setup_database):
    """Verify rubric-remedy weight relationships and degree validity."""
    db = SessionLocal()
    try:
        sample_rr = db.query(RubricRemedy).first()
        assert sample_rr is not None, "No rubricremedy mappings found."
        assert 1 <= sample_rr.weight <= 4, f"Weight degree {sample_rr.weight} out of range (1-4)."
        assert sample_rr.rubricid >= 0, f"Invalid rubricid {sample_rr.rubricid}"
        assert sample_rr.remedyid > 0, f"Invalid remedyid {sample_rr.remedyid}"

        remedy = db.query(Remedy).filter(Remedy.id == sample_rr.remedyid).first()
        assert remedy is not None, f"Linked remedy ID {sample_rr.remedyid} does not exist."
        print(f"\n[Mapping Test] RubricRemedy link validated: Rubric ID {sample_rr.rubricid} -> Remedy '{remedy.namelong}' (Weight: {sample_rr.weight})")
    finally:
        db.close()
