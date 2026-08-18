# Implementation Plan - HomeoTrack AI-First Homeopathic CDSS

**Document Purpose**: Definitive engineering implementation plan for building **HomeoTrack** — an AI-first Homeopathic Clinical Decision Support System (CDSS) leveraging the cloned `oorep` homeopathic repository database and guided by the system blueprint ([homeopathic_cdss_blueprint.md](file:///g:/HomeoTrack/homeopathic_cdss_blueprint.md)).

---

## Executive Summary & Design Vision

HomeoTrack is built around a **neuro-symbolic, case-based reasoning core**: an ontology-grounded knowledge base and rule engine for codified homeopathic knowledge, combined with empirical historical case precedent, calibrated over time by outcomes, and presented through an explainable, clinician-facing web application.

### Key Strategy Highlights
1. **Leveraging `oorep` Data**: Ingesting the 143,408 rubrics, 2,432 remedies, 1,359,576 rubric-remedy links, and 6,393 Materia Medica sections present in `oorep/oorep.sql.gz` to bootstrap the knowledge base without any cold-start delay.
2. **Virtual Environment First**: All development, scripts, and runtime dependencies will run inside a dedicated Python Virtual Environment (`.venv`), avoiding global contamination.
3. **Demonstration & Prototype Priority**: The roadmap is intentionally prioritized so that **Phase 0 & Phase 1** deliver a **fully functional, interactive web prototype** ready for live demonstration of case repertorization, remedy ranking, and Materia Medica inspection.
4. **Clean, Scalable Architecture**: A decoupled, modular directory layout (`homeotrack/` backend package + lightweight Web UI) that is simple to understand now and easily scales to microservices/graph stores later.

---

## 1. Database Utilization Strategy: Integrating `oorep`

The cloned `oorep` repository (`g:/HomeoTrack/oorep`) provides a goldmine of pre-digitized classical homeopathic knowledge.

### `oorep` Dataset Breakdown
| `oorep` Table | Record Count | HomeoTrack Domain Role |
|---|---|---|
| `rubric` | 143,408 | Hierarchical rubric tree (Chapters, Mother Rubrics, Sub-Rubrics, Full Paths). |
| `remedy` | 2,432 | Comprehensive remedy catalog (Short names e.g. `nux-v`, long names e.g. `Nux Vomica`, synonyms). |
| `rubricremedy` | 1,359,576 | Rubric-to-Remedy weighted matrix (Degree gradings: 1st, 2nd, 3rd, 4th degree). |
| `info` | 2 | Source metadata (Kent, Boenninghausen, etc.). |
| `mminfo`, `mmchapter`, `mmsection` | 6,393 | Materia Medica chapters, sections, remedy keynotes, and narrative content. |

### Ingestion Pipeline Strategy (`homeotrack/database/ingest_oorep.py`)
- We will build an automated Python ingestion script that reads `oorep/oorep.sql.gz` and populates a high-performance local SQLite database (`homeotrack.db`) for rapid local prototype development (or PostgreSQL for production).
- Indexes will be created on `rubric(id, textt, fullpath)`, `remedy(id, nameabbrev, namelong)`, and `rubricremedy(rubricid, remedyid, weight)` to ensure repertorization queries run in **under 50ms**.

---

## 2. Technical Stack & Environment Architecture

### Virtual Environment (`.venv`)
- Python 3.10+ virtual environment (`.venv`) created inside `g:/HomeoTrack/.venv`.
- Key Dependencies:
  - **API Server & Routing**: `fastapi`, `uvicorn`
  - **Data Access & ORM**: `sqlalchemy`, `pydantic`
  - **Search & Vector Utilities**: `scikit-learn` / `sentence-transformers` (prepared for Phase 4)
  - **Web Frontend**: HTML5/CSS3 Vanilla CSS + JavaScript (Modern glassmorphic responsive UI, live dynamic search, interactive rubric-remedy heatmaps).

### Clean & Scalable Directory Structure
```
g:/HomeoTrack/
├── .venv/                        # Dedicated Python Virtual Environment
├── oorep/                        # Cloned oorep dataset repository (raw source)
├── homeotrack/                   # Main HomeoTrack Application Package
│   ├── __init__.py
│   ├── config.py                 # Application settings & environment parameters
│   ├── database/                 # Ingestion & Database Access Layer
│   │   ├── __init__.py
│   │   ├── connection.py         # SQLAlchemy engine & session manager
│   │   ├── models.py             # ORM models (Rubric, Remedy, RubricRemedy, Case, Prescription)
│   │   └── ingest_oorep.py       # SQL dump parser & DB seeder
│   ├── core/                     # Core Symbolic Intelligence & Reasoning Engine
│   │   ├── __init__.py
│   │   ├── ontology.py           # Domain data models & Homeopathic weighting rules
│   │   ├── repertorizer.py       # Kent-style weighted symbolic reasoning engine
│   │   └── explanation.py        # Evidence generator & traceability logger
│   ├── services/                 # Clinical Domain Services
│   │   ├── __init__.py
│   │   ├── case_service.py       # Patient case & intake management
│   │   └── materia_medica.py     # Materia Medica lookup service
│   └── api/                      # FastAPI Server & Web UI
│       ├── __init__.py
│       ├── main.py               # App entrypoint
│       ├── router.py             # REST API endpoints
│       └── static/               # CSS, JS & Web Prototype Assets
│           ├── index.html        # Interactive Clinical Web Interface
│           ├── styles.css        # Premium dark glassmorphism design system
│           └── app.js            # Interactive Case Intake & Repertorization UI logic
├── tests/                        # Test suite for engine correctness
│   ├── test_ingest.py
│   └── test_repertorizer.py
├── requirements.txt              # Project dependencies
├── homeopathic_cdss_blueprint.md # Original Engineering Blueprint
└── implementation_plan.md        # This Implementation Plan
```

---

## 3. Phased Roadmap (Demonstration First, Scalable Execution)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 0: Virtual Environment Setup & `oorep` Ingestion Pipeline          │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Symbolic Reasoning Core & Interactive Prototype (DEMO READY!)   │
│ - Kent-style weighted repertorization engine over 1.35M oorep links       │
│ - Interactive Web UI for Rubric Search, Case Totality, & Remedy Ranking   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Clinical Operational Modules (Patients, Intake, Prescriptions)   │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Outcome Tracking & Case-Based Feedback Loop (CBR Pipeline)      │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Hybrid Enhancements (Vector Free-Text Mapping & Guarded LLM)    │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: ML-Calibrated Ranking & Multi-Clinic Scale                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Detailed Phase Breakdown

#### Phase 0 — Environment & Data Ingestion Foundation
- **Goal**: Set up `.venv`, define dependencies, parse `oorep.sql.gz`, and populate `homeotrack.db` SQLite database.
- **Tasks**:
  1. Create virtual environment `.venv` and activate it.
  2. Write `requirements.txt` with FastAPI, Uvicorn, SQLAlchemy, Pydantic.
  3. Create `homeotrack/database/models.py` matching the `oorep` structure + HomeoTrack case tables.
  4. Create `homeotrack/database/ingest_oorep.py` to extract `oorep.sql.gz` data (rubrics, remedies, rubricremedy, materia medica) into `homeotrack.db`.
- **Exit Criterion**: Querying `homeotrack.db` returns 2,432 remedies and 143,408 rubrics with <50ms lookup times.

#### Phase 1 — Symbolic Reasoning Core & Interactive Prototype (Demonstration Ready)
- **Goal**: Deliver a complete, working prototype web app that demonstrates Kent-style weighted repertorization and Materia Medica lookup on real `oorep` data.
- **Tasks**:
  1. **Core Repertorization Engine (`homeotrack/core/repertorizer.py`)**:
     - Input: List of rubrics with intensity weights (1–4), homeopathic symptom hierarchy tags (Mental General, Physical General, Particular), and modalities (Aggravation, Amelioration).
     - Calculation: Kent's scoring formula (Sum of remedy weights in rubrics * symptom hierarchy multiplier) + Rubric Coverage count + Prominence score.
     - Output: Ranked candidate remedies with transparent evidence breakdown (which rubrics were matched, degree per rubric, score).
  2. **Explanation Service (`homeotrack/core/explanation.py`)**:
     - Formats traceable clinical reasoning objects for each remedy candidate.
  3. **Materia Medica Service (`homeotrack/services/materia_medica.py`)**:
     - Fetches narrative notes and section text from `oorep` MM tables for candidate remedies.
  4. **Interactive Web Prototype UI (`homeotrack/api/static/`)**:
     - Modern UI with live rubric search auto-complete.
     - Symptom totality selector (add rubrics, assign hierarchy: Mental/Physical/Particular, weight: 1-4).
     - "Run Repertorization" button generating interactive remedy ranking table with detailed evidence drawer and Materia Medica lookup.
     - Consultation recording simulator.
- **Exit Criterion**: Practitioner can enter a 5-symptom case totality, click "Analyze Case", and immediately see accurate ranked remedies with full rubric match breakdowns. **Fully demonstration-ready!**

#### Phase 2 — Clinical Operational Modules
- **Goal**: Expand prototype into a clinical management platform.
- **Tasks**:
  1. Patient Registration & Profile History (`/patients`).
  2. Case Intake Workflow & Physical Examination records.
  3. Prescription logging with locked knowledge-base version tag.

#### Phase 3 — Outcome Tracking & Retain Loop (CBR Framework)
- **Goal**: Close the learning loop by capturing structured follow-up outcomes.
- **Tasks**:
  1. Follow-Up UI: Improvement rating (Marked / Moderate / Unchanged / Aggravated).
  2. Practitioner Correction Logging (when practitioner overrides suggested remedy).
  3. Historical Case Corpus storage for similarity search.

#### Phase 4 — Hybrid Neuro-Symbolic Enhancements
- **Goal**: Add AI intake assistance and guarded explanations.
- **Tasks**:
  1. Vector search over rubric text for free-text symptom-to-rubric auto-suggestion (human-confirmed).
  2. LLM explanation generator strictly bounded by symbolic evidence (no hallucinated claims).
  3. Case-similarity candidate retrieval.

#### Phase 5 — ML Calibration & Production Readiness
- **Goal**: Supervised ML ranking calibration on accumulated outcome dataset, security auditing, and clinic scaling.

---

## User Review Required

> [!IMPORTANT]
> **Prototype Demonstration Strategy**:
> Phase 0 and Phase 1 will be completed first to deliver a **working, running Web Prototype** using the 1.35M homeopathic data records from `oorep`. You will be able to launch `python -m homeotrack.api.main` inside the virtual environment and interactively analyze cases in your web browser!

> [!NOTE]
> **Virtual Environment**:
> All python execution will be strictly isolated inside `g:/HomeoTrack/.venv`.

---

## Proposed Changes & File Creation Plan

### [NEW] Configuration & Virtual Environment Setup
- [requirements.txt](file:///g:/HomeoTrack/requirements.txt): Core dependencies (FastAPI, Uvicorn, SQLAlchemy, Pydantic, etc.).

### [NEW] Package Architecture (`homeotrack/`)
- [__init__.py](file:///g:/HomeoTrack/homeotrack/__init__.py): Root package initialization.
- [config.py](file:///g:/HomeoTrack/homeotrack/config.py): App configurations & DB paths.

### [NEW] Database & Ingestion Component (`homeotrack/database/`)
- [connection.py](file:///g:/HomeoTrack/homeotrack/database/connection.py): SQLite DB connection manager.
- [models.py](file:///g:/HomeoTrack/homeotrack/database/models.py): SQLAlchemy models for `rubric`, `remedy`, `rubricremedy`, `mminfo`, `mmchapter`, `mmsection`, `case`, `prescription`, `outcome`.
- [ingest_oorep.py](file:///g:/HomeoTrack/homeotrack/database/ingest_oorep.py): Automated parser importing `oorep/oorep.sql.gz` dump into `homeotrack.db`.

### [NEW] Core Intelligence Component (`homeotrack/core/`)
- [ontology.py](file:///g:/HomeoTrack/homeotrack/core/ontology.py): Case totality, Rubric, Remedy, and Weighting data structures.
- [repertorizer.py](file:///g:/HomeoTrack/homeotrack/core/repertorizer.py): Kent-style symbolic reasoning and remedy ranking engine.
- [explanation.py](file:///g:/HomeoTrack/homeotrack/core/explanation.py): Clinical evidence formatter and decision rationale builder.

### [NEW] Service Layer (`homeotrack/services/`)
- [case_service.py](file:///g:/HomeoTrack/homeotrack/services/case_service.py): Case CRUD & history operations.
- [materia_medica.py](file:///g:/HomeoTrack/homeotrack/services/materia_medica.py): Materia Medica text query service.

### [NEW] Web API & Interactive Prototype (`homeotrack/api/`)
- [main.py](file:///g:/HomeoTrack/homeotrack/api/main.py): FastAPI app server.
- [router.py](file:///g:/HomeoTrack/homeotrack/api/router.py): Endpoints for rubric search, repertorization, remedies, materia medica, and case intake.
- [static/index.html](file:///g:/HomeoTrack/homeotrack/api/static/index.html): Clinical Web UI for interactive case analysis & demonstration.
- [static/styles.css](file:///g:/HomeoTrack/homeotrack/api/static/styles.css): Modern responsive CSS styling.
- [static/app.js](file:///g:/HomeoTrack/homeotrack/api/static/app.js): Dynamic UI logic (rubric auto-complete, symptom weighting, interactive heatmaps).

### [NEW] Test Suite (`tests/`)
- [test_repertorizer.py](file:///g:/HomeoTrack/tests/test_repertorizer.py): Unit tests for Kent-style repertorization logic against benchmark textbook cases.

---

## Verification Plan

### Automated Tests
1. **Database Ingestion Verification**:
   - Verify `rubric` count is ~143,408.
   - Verify `remedy` count is ~2,432.
   - Verify `rubricremedy` count is ~1,359,576.
2. **Repertorization Engine Test**:
   - Run `pytest` or python script on `tests/test_repertorizer.py` verifying that a known symptom set (e.g. Mind irritability + Head morning headache + Stomach burning) correctly ranks expected remedies like `Nux Vomica` / `Sulphur`.

### Manual Verification & Demo Walkthrough
1. **Launch Server**: Run `python -m homeotrack.api.main` in `.venv`.
2. **Access Web Prototype**: Open `http://localhost:8000` in browser.
3. **Interactive Case Analysis**:
   - Search rubrics using live auto-complete (e.g., search "mind", "head", "stomach").
   - Add rubrics to patient totality, tag hierarchy (Mental General / Physical General / Particular), and assign weights (1 to 4).
   - Click "Run Repertorization".
   - Verify ranked remedy table displaying total score, matched rubric count, and degree breakdown per rubric.
   - Click a candidate remedy to view its `oorep` Materia Medica profile.
