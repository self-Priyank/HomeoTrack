from sqlalchemy import Column, Integer, String, Boolean, Text, Index
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Info(Base):
    """Metadata regarding repertory publications in oorep."""
    __tablename__ = "info"

    abbrev = Column(String(256), primary_key=True)
    title = Column(String(257), nullable=False)
    languag = Column(String(258), nullable=False)
    authorlastname = Column(String(259))
    authorfirstname = Column(String(260))
    yearr = Column(Integer)
    publisher = Column(String(261))
    license = Column(String(255))
    edition = Column(String(255))
    access = Column(String(262))
    displaytitle = Column(String(255))


class Rubric(Base):
    """Hierarchical repertory rubric entries."""
    __tablename__ = "rubric"

    id = Column(Integer, primary_key=True, autoincrement=True)
    abbrev = Column(String(270), nullable=False, index=True)
    rubric_id = Column(Integer, nullable=False, index=True)  # Rubric ID within the specific edition
    mother = Column(Integer, index=True)
    ismother = Column(Boolean)
    chapterid = Column(Integer, nullable=False, index=True)
    fullpath = Column(Text, index=True)
    path = Column(String(272))
    textt = Column(String(273), index=True)


Index("idx_rubric_abbrev_id", Rubric.abbrev, Rubric.rubric_id)


class Remedy(Base):
    """Master catalog of homeopathic remedies."""
    __tablename__ = "remedy"

    id = Column(Integer, primary_key=True, index=True)
    nameabbrev = Column(String(267), nullable=False, index=True)
    namelong = Column(String(268), nullable=False, index=True)
    namealt = Column(Text)  # JSON array of alternative names/synonyms


class RubricRemedy(Base):
    """Repertory matrix linking rubrics to remedies with weights/degrees."""
    __tablename__ = "rubricremedy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    abbrev = Column(String(265), nullable=False, index=True)
    rubricid = Column(Integer, nullable=False, index=True)  # Maps to rubric.rubric_id for that edition
    remedyid = Column(Integer, nullable=False, index=True)  # Maps to remedy.id
    weight = Column(Integer, nullable=False)  # Degree (1st=1, 2nd=2, 3rd=3, 4th=4)
    chapterid = Column(Integer, nullable=False)


Index("idx_rubricremedy_rubric_remedy", RubricRemedy.rubricid, RubricRemedy.remedyid)
Index("idx_rubricremedy_remedy_rubric", RubricRemedy.remedyid, RubricRemedy.rubricid)
Index("idx_rubricremedy_abbrev_rubric", RubricRemedy.abbrev, RubricRemedy.rubricid)


class MMInfo(Base):
    """Materia Medica work metadata."""
    __tablename__ = "mminfo"

    id = Column(Integer, primary_key=True)
    abbrev = Column(String(265), nullable=False, unique=True)
    lang = Column(String(5))
    fulltitle = Column(String(255))
    authorlastname = Column(String(255))
    authorfirstname = Column(String(255))
    publisher = Column(String(255))
    yearr = Column(Integer)
    license = Column(String(255))
    access = Column(String(262))
    displaytitle = Column(String(255))


class MMChapter(Base):
    """Materia Medica chapter (per remedy)."""
    __tablename__ = "mmchapter"

    id = Column(Integer, primary_key=True)
    mminfo_id = Column(Integer, index=True)
    heading = Column(String(255), nullable=False)
    remedy_id = Column(Integer, index=True)


class MMSection(Base):
    """Materia Medica narrative sections."""
    __tablename__ = "mmsection"

    id = Column(Integer, primary_key=True)
    mmchapter_id = Column(Integer, index=True)
    depth = Column(Integer, nullable=False)
    parent_sec_id = Column(Integer)
    succ_sec_id = Column(Integer)
    heading = Column(String(265), nullable=False)
    content = Column(Text)


# HomeoTrack Operational Entities
class Case(Base):
    """Patient consultation episode / case totality."""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_name = Column(String(255), nullable=False)
    patient_age = Column(Integer)
    patient_gender = Column(String(50))
    chief_complaint = Column(Text)
    created_at = Column(String(50), nullable=False)


class CaseSymptom(Base):
    """Symptom entry associated with a case totality."""
    __tablename__ = "case_symptoms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, index=True)
    rubric_id = Column(Integer, index=True)
    intensity_weight = Column(Integer, default=1)
    hierarchy = Column(String(50), default="particular")
    modality = Column(String(50), default="none")


class Prescription(Base):
    """Prescription record for a case."""
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    case_id = Column(Integer, index=True)
    remedy_id = Column(Integer, index=True)
    remedy_name = Column(String(255), nullable=False)
    potency = Column(String(50), nullable=False)
    prescribed_at = Column(String(50), nullable=False)
    notes = Column(Text)


class Outcome(Base):
    """Structured follow-up outcome evaluation."""
    __tablename__ = "outcomes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prescription_id = Column(Integer, index=True)
    improvement_level = Column(String(50), nullable=False)
    notes = Column(Text)
    recorded_at = Column(String(50), nullable=False)
