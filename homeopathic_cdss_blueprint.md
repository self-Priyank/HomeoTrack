# AI-First Homeopathic Clinical Decision Support Platform
## Engineering Blueprint

**Document type:** Definitive system architecture and engineering blueprint
**Design philosophy:** Core Intelligence → Supporting Services → Operational Modules → External Interfaces
**Audience:** Senior engineering team responsible for implementation

---

## 0. How to Read This Document

This blueprint is written **inside-out**, matching the order in which the system must actually be built and understood:

1. **Core Analysis** — what the intelligence is, what it needs, how it reasons, what it must learn.
2. **Core Intelligence Layer** — the reasoning engine itself, with competing designs compared and one recommended.
3. **Knowledge & Data Layer** — what feeds the reasoning engine.
4. **Supporting Services** — the platform-level services the intelligence layer depends on to run in production (retrieval, storage, feedback, versioning).
5. **Operational Modules** — the clinical workflow (registration → follow-up) rebuilt as a thin producer/consumer of the intelligence layer.
6. **External Interfaces** — APIs, UI, integrations — the outermost, most replaceable layer.
7. **Cross-cutting engineering concerns** — roadmap, testing, scalability, risk, extensibility.

No section assumes a decision that hasn't been justified in an earlier section. If you are building this system, build it in the order it is documented.

---

## 1. Core Analysis

### 1.1 What is the fundamental intelligence of this platform?

Strip away every screen, form, and table, and the irreducible function of this platform is:

> **Given a structured representation of a patient's totality of symptoms (mental, general, and particular), produce a ranked, explainable set of candidate remedies, grounded in homeopathic materia medica / repertory knowledge and in the outcomes of similar historical cases — and improve that ranking over time as outcomes are recorded.**

This is a **case-based, knowledge-grounded ranking and explanation problem**, not a conversational or generative problem, and not a transactional CRUD problem. Everything else in the system (registration, scheduling, dispensing, billing-adjacent features) exists to feed structured input into this function or to capture structured output/outcomes from it.

The fundamental intelligence therefore has three permanent responsibilities:

| Responsibility | Description |
|---|---|
| **Represent** | Turn unstructured patient narrative into a structured "case" (symptom totality) that can be reasoned over. |
| **Reason** | Compare that case against (a) codified homeopathic knowledge (repertories, materia medica, ontological remedy–symptom relationships) and (b) similar historical cases, to rank candidate remedies with explanations. |
| **Learn** | Capture the outcome of the prescribed remedy against the case and feed it back so future ranking improves — this is what separates a "digital repertory lookup tool" from a genuine decision-support system. |

### 1.2 Information required by the intelligence layer

The reasoning engine cannot function without four categories of input, each with a distinct lifecycle:

1. **Case data (per patient, per episode)** — chief complaints, mental/emotional generals, physical generals, particulars, modalities (what aggravates/ameliorates), causation (Kent's "causa occasionalis"), past history, family history, physical exam findings. This is the *query* the reasoning engine answers.
2. **Reference knowledge (static-ish, curated)** — repertories (e.g., Kent's, Boenninghausen's, Synthesis-style rubrics), materia medica (remedy pictures), organon principles, drug-symptom relationships, remedy relationships (complementary, antidotal, follow-well-after). This is the *codified prior*.
3. **Case history corpus (grows over time)** — every past case in the system: its symptom totality, the remedy(ies) tried, and the recorded outcome. This is the *empirical prior*, and is the platform's actual long-term moat, because no public dataset of this shape exists at scale (see §4).
4. **Outcome/feedback signal (grows over time)** — structured follow-up data: improved / partially improved / no improvement / aggravated / new symptoms emerged, and practitioner annotations ("remedy was correct but potency wrong," etc.). This is the *learning signal*.

### 1.3 The reasoning process (conceptually, before choosing an implementation)

Regardless of implementation technology, the reasoning process must perform these steps, in order:

1. **Normalize** — map free-text/clinician-entered symptoms to a controlled vocabulary of rubrics/symptoms (synonym resolution, hierarchy placement).
2. **Weight** — apply homeopathic weighting logic: mental generals > physical generals > particulars; peculiar/characteristic symptoms outweigh common ones; modalities refine rather than replace.
3. **Retrieve candidates** — two parallel retrieval paths:
   - *Knowledge-path*: which remedies are repertorized against this symptom set (symbolic/graph lookup).
   - *Case-path*: which historical cases are most similar to this one, and what worked for them (similarity search).
4. **Reconcile** — merge the two candidate lists, resolve disagreement (e.g., a remedy strongly indicated by repertory but with poor historical outcomes locally should be flagged, not silently boosted or suppressed).
5. **Rank & explain** — produce an ordered shortlist, each with a traceable explanation ("covers 7/9 rubrics including 2 mental generals; matched 4 similar past cases with 75% improvement").
6. **Present for human decision** — the practitioner remains the decision-maker; the system's output is advisory, always.
7. **Capture outcome** — once treatment plays out, the result is written back as a new labeled data point.

This closes the loop: step 7 feeds step 3's case-path for all future patients. This loop **is** the "learning" the vision document refers to — it does not require retraining a deep model to be real learning; it requires disciplined data capture and the right retrieval/weighting design.

### 1.4 Knowledge required

- **Repertory structure**: hierarchical rubric tree (chapter → section → rubric → sub-rubric) with remedy gradings (typically 1st/2nd/3rd degree, i.e., bold/italic/plain in classical repertories).
- **Materia medica structure**: per-remedy narrative descriptions, keynotes, characteristic/"peculiar" symptoms, source (plant/mineral/animal), miasm classification if the practice uses it.
- **Remedy relationship knowledge**: complementary remedies, antidotes, remedies that "follow well," incompatibilities.
- **Posology conventions**: potency selection heuristics (not medical dosing of controlled substances — this is homeopathic potency, an important distinction to keep clean in any compliance conversation).
- **Case precedent knowledge**: the platform's own growing case base, per §1.2.3.

### 1.5 Learning opportunities

| Opportunity | Data needed | Value |
|---|---|---|
| Improve **case-similarity ranking** | Case totality + outcome | Better "what worked for similar patients" retrieval |
| Improve **symptom-to-rubric mapping** | Practitioner corrections to auto-suggested rubrics | Reduces normalization errors over time |
| Improve **remedy ranking calibration** | Outcome-labeled prescriptions | Learn that repertory score alone is a weak predictor; blend with empirical success rate |
| Detect **practitioner-specific or population-specific patterns** | Aggregated outcomes | Useful for clinic-level insight, not a replacement for individual reasoning |
| Flag **repertory gaps** | Cases where no rubric fit well | Signals where the knowledge base needs curation |

### 1.6 Dependencies between layers

```
Outcome Feedback  ──feeds──▶  Case History Corpus  ──feeds──▶  Case-Similarity Retrieval
Reference Knowledge (Repertory/MM) ──feeds──▶  Symbolic Retrieval & Normalization
                                                        │
                                    both feed ▶  Reasoning/Ranking Engine (CORE)
                                                        │
                                          Operational Modules consume ▶ Core, and produce ▶ Case + Outcome data
                                                        │
                                          External Interfaces expose ▶ Operational Modules
```

**Key implication for build order:** the Reasoning/Ranking Engine and the Knowledge Representation it depends on must be built and validated *before* any meaningful UI or workflow work, because every downstream layer exists only to feed it correctly-shaped data or to consume its output.

---

## 2. Core Intelligence Layer — Comparing Architectures

This is the most important section of the document. Each candidate approach is evaluated against the same criteria: advantages, disadvantages, scalability, maintainability, computational complexity, implementation complexity, extensibility, operational cost, and suitability for *this* project specifically (small-to-medium structured domain, high explainability requirement, sparse proprietary data, safety-sensitive).

### 2.1 Approach A — Pure Rule-Based Expert System (production rules over repertory)

Classical expert-system design: symptoms as facts, repertory gradings as IF-THEN rules, forward-chaining inference (à la CLIPS/Drools) to score remedies.

- **Advantages**: Fully explainable (every score traces to explicit rules); matches how homeopaths already think (repertorization is literally rule-based scoring); no training data required to bootstrap; deterministic and auditable — important for a clinical tool.
- **Disadvantages**: Cannot learn from outcomes without manual rule editing; brittle to symptom phrasing variance; cannot capture "similar case" reasoning (no notion of case-to-case similarity, only symptom-to-remedy).
- **Scalability**: Scales well computationally (rule evaluation is cheap); scales poorly *organizationally* — every new repertory edition or correction is manual curation work.
- **Maintainability**: High maintainability for the rules themselves (transparent), but maintenance load grows linearly with knowledge base size and needs domain-expert time, not just engineering time.
- **Computational complexity**: O(rules × symptoms) per query — trivial at repertory scale (tens of thousands of rubrics).
- **Implementation complexity**: Low-to-medium; the hard part is data entry/digitization of the repertory, not the inference engine.
- **Extensibility**: Poor for anything beyond symptom→remedy matching (no case similarity, no free-text understanding).
- **Operational cost**: Very low (no GPU, no vector infra needed on its own).
- **Suitability**: Necessary but **not sufficient**. This is the correct engine for the *symbolic retrieval path* in §1.3 step 3, but cannot alone deliver case-based learning or handle free-text intake.

### 2.2 Approach B — Knowledge Graph + Ontology-Driven Reasoning

Model symptoms, rubrics, remedies, relationships (complementary/antidote/follows-well), and patient cases as nodes/edges in a graph (e.g., property graph or RDF/OWL ontology), and use graph queries / graph algorithms (path-finding, community detection, graph embeddings) for retrieval and even similarity.

- **Advantages**: Naturally represents the hierarchical repertory structure *and* remedy-relationship knowledge *and* case linkage in one substrate; supports both symbolic queries (Approach A's job) and graph-based similarity (via shared-neighbor or embedding methods); highly explainable (path = explanation); extensible to add new relationship types without schema rewrites.
- **Disadvantages**: Requires ontology design discipline up front (mis-modeled hierarchy is costly to fix later); graph databases (Neo4j, TigerGraph, or RDF stores) add an infra dependency; team needs graph-modeling expertise.
- **Scalability**: Good — graph databases handle millions of nodes/edges comfortably at this domain's expected scale (repertory ~50–100k rubric nodes, remedies ~3–5k, cases growing organically).
- **Maintainability**: Medium-high; ontology changes are more structured than raw rule edits, and tooling (e.g., OWL reasoners, SHACL validation) helps catch inconsistencies.
- **Computational complexity**: Graph traversal is generally sub-quadratic for local queries (bounded-depth traversal from a case's symptom nodes); some graph algorithms (centrality, embeddings) are more expensive but computed offline/batch.
- **Implementation complexity**: Medium-high initially (ontology + ETL from repertory sources), moderate thereafter.
- **Extensibility**: Excellent — this is the substrate that most naturally absorbs new knowledge types (new relationship classes, cross-references to conventional-medicine ontologies like SNOMED/ICD for interoperability, if ever needed).
- **Operational cost**: Low-medium (graph DB hosting; no GPU required for the core structure, though embeddings are optional add-ons).
- **Suitability**: **Very high.** This is recommended as the **backbone knowledge representation** — not a competing alternative to Approach A but its natural superset and long-term home.

### 2.3 Approach C — Vector/Semantic Search over Case & Knowledge Text

Embed symptom descriptions, rubric text, materia medica text, and past cases into a vector space (via a text embedding model) and retrieve nearest neighbors for both "what rubric does this symptom match" and "what past case is this most like."

- **Advantages**: Handles free-text and phrasing variance far better than exact rule/keyword matching; single mechanism serves both normalization (symptom→rubric) and case similarity; easy to keep improving by swapping embedding models; low implementation cost to get a first version working.
- **Disadvantages**: Weak explainability on its own (nearest-neighbor distance isn't a clinical justification); risk of superficial lexical similarity being mistaken for clinical similarity (e.g., "burning pain better by heat" vs "burning pain worse by heat" can embed close together despite opposite modality, which is clinically critical); requires enough embedded content to be useful for case-similarity specifically (cold-start problem, see §4).
- **Scalability**: Excellent — approximate nearest neighbor (ANN) indexes (HNSW, IVF-PQ) scale to millions of vectors with sub-linear query time.
- **Maintainability**: Medium — re-embedding needed when the embedding model changes; index rebuilds are operationally simple but must be scheduled.
- **Computational complexity**: ANN query ~O(log n) with HNSW; embedding generation is O(1) per document (amortized, batched).
- **Implementation complexity**: Low-medium (mature open-source and managed vector DB options).
- **Extensibility**: High for retrieval; low for explanation and clinical-rule enforcement unless paired with symbolic structure.
- **Operational cost**: Low-medium (vector DB hosting; embedding inference cost, small if using efficient open models, can avoid GPU if using CPU-optimized small embedding models at this data scale).
- **Suitability**: **High, but only as a component**, specifically: (a) intake normalization assistance (suggesting rubrics from free text, human-confirmed, never auto-applied silently), and (b) the case-similarity path, *guarded* by symbolic modality/polarity checks from the ontology to prevent the "opposite modality" failure mode above.

### 2.4 Approach D — Classical Machine Learning (e.g., gradient-boosted trees, logistic regression on engineered features) for remedy ranking

Engineer features from structured case data (rubric-coverage vectors, modality flags, demographic features) and train a supervised ranker on outcome-labeled historical cases.

- **Advantages**: Strong performance-per-data-point on structured/tabular features; highly interpretable with SHAP/feature-importance tooling; cheap to train and serve; doesn't need huge data volumes to start being useful (thousands, not millions, of labeled cases).
- **Disadvantages**: Requires a meaningful volume of *outcome-labeled* cases before it adds value over the symbolic baseline — this platform starts with zero; feature engineering effort is non-trivial for a domain this nuanced; cannot handle novel/free-text symptom description on its own.
- **Scalability**: Excellent — training and inference are cheap even at scale.
- **Maintainability**: Medium — models need periodic retraining and drift monitoring as the case corpus grows and practitioner population/case-mix shifts.
- **Computational complexity**: Training O(n log n) per tree ensemble; inference is near O(1) per case.
- **Implementation complexity**: Medium (feature pipeline is the real work, not the model).
- **Extensibility**: Medium — good for ranking/calibration refinement, not for representation or retrieval.
- **Operational cost**: Very low.
- **Suitability**: **High, but deferred.** This becomes valuable once the case corpus reaches sufficient labeled volume (see §4.4 for a concrete threshold-based rollout plan). It should be designed for from day one (i.e., the data model must capture the features it will need) but not built into the v1 critical path.

### 2.5 Approach E — Deep Learning (custom neural rankers, learned embeddings end-to-end)

Train domain-specific deep models (e.g., a learned case-similarity encoder, or a neural ranker) directly on the platform's data.

- **Advantages**: Potentially highest ceiling on ranking quality once data volume is large; can jointly learn representation and ranking.
- **Disadvantages**: Needs large labeled datasets this domain does not have and will take years to accumulate even with disciplined capture; high risk of overfitting to a small, non-representative case base; poor explainability unless heavily instrumented; high engineering and MLOps overhead (training infra, versioning, monitoring) for a benefit that's speculative at current data scale.
- **Scalability**: Good once mature, but the barrier is data, not compute.
- **Maintainability**: Low-medium — deep models require dedicated ML engineering ownership, retraining pipelines, and drift detection.
- **Computational complexity**: Training is expensive (GPU); inference can be optimized but still heavier than ML/graph alternatives.
- **Implementation complexity**: High.
- **Extensibility**: High in theory, but only once the org has the data and MLOps maturity to support it.
- **Operational cost**: High relative to alternatives.
- **Suitability**: **Not recommended for v1 or v2.** Revisit only after the case corpus and outcome-labeling volume are large (see roadmap §9) and Approach D has demonstrably plateaued.

### 2.6 Approach F — Large Language Models (LLM-centric reasoning, e.g., "ask an LLM to suggest a remedy")

Use a general-purpose or fine-tuned LLM to read the case narrative and directly generate remedy suggestions, possibly with RAG over repertory/materia medica text.

- **Advantages**: Best-in-class free-text understanding; can generate natural-language explanations fluently; fast to prototype.
- **Disadvantages**: **Highest clinical-safety risk of all approaches** — LLMs can hallucinate remedy-symptom relationships, invent plausible-sounding but false repertory citations, and are not inherently constrained to the codified knowledge base unless tightly grounded; poor guaranteed traceability without heavy RAG discipline; non-deterministic output complicates auditability and regulatory posture; cost scales with usage (per-token) rather than being a fixed infra cost.
- **Scalability**: Good operationally (managed APIs scale), but cost scales linearly with query volume, unlike the near-fixed-cost graph/rule engine.
- **Maintainability**: Medium — prompt/RAG pipeline maintenance is a real, ongoing engineering task (prompt drift, model version changes).
- **Computational complexity**: Effectively O(1) per query from the caller's perspective (hosted inference), but expensive in absolute terms per query vs. graph/rule lookups.
- **Implementation complexity**: Low to get a demo working; high to make it *safe and grounded* enough for clinical use.
- **Extensibility**: High for surface-level tasks (summarization, explanation drafting, free-text intake assistance).
- **Operational cost**: Medium-high, and variable (usage-based).
- **Suitability**: **Recommended only in a tightly scoped, non-decision-making role**: (1) assisting free-text intake by drafting structured symptom candidates for practitioner confirmation, (2) drafting human-readable explanations *from the symbolic engine's already-computed evidence* (never inventing new evidence), and (3) summarizing case history. **An LLM must never be the sole or final source of a ranked remedy recommendation** in this system — that responsibility belongs to the symbolic/graph/case-similarity engine, with the LLM strictly as a grounded presentation layer on top of its output.

### 2.7 Approach G — Case-Based Reasoning (CBR) as an explicit framework

Formalize the "retrieve → reuse → revise → retain" CBR cycle as the platform's architecture, rather than as an ad hoc feature.

- **Advantages**: This is *literally what homeopathic case-taking already is*, methodologically — CBR is not a bolt-on AI technique here but a structural match to the domain. It gives principled slots for the case-similarity retrieval (§2.3), outcome capture (§1.2.4), and the "revise" step naturally accommodates a practitioner overriding a suggestion.
- **Disadvantages**: CBR as a named framework is not a single algorithm — it still needs a similarity function (candidate: §2.3's vector search, guarded by §2.2's ontology) and an indexing structure (candidate: §2.2's graph or a dedicated case index). So CBR is an *organizing pattern*, not a replacement for choosing 2.1–2.3.
- **Scalability/Maintainability/Complexity**: Inherits the properties of whichever similarity/index mechanism backs it.
- **Suitability**: **Adopt as the top-level architectural pattern** for the case-history side of the system; it is the conceptual glue between §2.2, §2.3, and §1.3's step 6-7 loop, not a competing implementation choice.

### 2.8 Recommendation — Hybrid Architecture

No single approach is sufficient; the comparison above is not academic — it directly determines the recommended design:

> **A Knowledge Graph/Ontology (2.2) as the system of record for symbolic homeopathic knowledge, queried by a Rule-Based symbolic engine (2.1) for repertorization, combined with a Case-Based Reasoning cycle (2.7) whose similarity function is Vector/Semantic Search (2.3) guarded by ontology-derived modality/polarity constraints, whose ranking is calibrated over time by Classical ML (2.4) once sufficient outcome data exists, with an LLM (2.6) confined strictly to free-text intake assistance and natural-language explanation generation grounded in the symbolic engine's own evidence.**

This is depicted as the **Neuro-Symbolic Hybrid Reasoning Core**:

```
                         ┌─────────────────────────────┐
                         │   Case Intake (structured)   │
                         └──────────────┬───────────────┘
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                                              ▼
   ┌───────────────────────────┐                 ┌───────────────────────────┐
   │  SYMBOLIC PATH             │                 │  CASE-SIMILARITY PATH      │
   │  Rule engine over          │                 │  Vector search over case   │
   │  Knowledge Graph            │◀──constrains───│  corpus, ontology-guarded  │
   │  (repertory + relations)   │   (polarity/    │  similarity                │
   │                             │    modality)    │                            │
   └──────────────┬──────────────┘                └──────────────┬─────────────┘
                  │                                               │
                  └───────────────────┬───────────────────────────┘
                                       ▼
                         ┌─────────────────────────────┐
                         │  RECONCILIATION & RANKING     │
                         │  (rule-based v1 → ML-         │
                         │   calibrated ranking once      │
                         │   data threshold met)          │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │  EXPLANATION LAYER (LLM,       │
                         │  grounded strictly in the      │
                         │  evidence object above —       │
                         │  no free generation of facts)  │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │  Practitioner review & decision │
                         └──────────────┬───────────────┘
                                        │
                         ┌──────────────▼───────────────┐
                         │  Outcome capture → retained as  │
                         │  new case in the corpus (CBR     │
                         │  "retain" step)                  │
                         └───────────────────────────────┘
```

This hybrid design is explicitly chosen because it satisfies the domain's non-negotiable constraint — **every recommendation must be explainable and traceable to codified knowledge or precedent, never to an opaque model** — while still allowing the statistically-learned components (2.3, 2.4) to improve quality as data accumulates, and reserving the LLM's genuine strength (free-text fluency) for the one place it cannot cause harm: presentation, not decision-making.

---

## 3. Knowledge Model

### 3.1 Ontology core classes

| Class | Description | Key relationships |
|---|---|---|
| `Symptom` | Atomic clinical observation | `belongsToRubric`, `hasModality`, `hasPolarity` (aggravation/amelioration), `hasLocation` |
| `Rubric` | Repertory entry (a symptom category) | `parentRubric` (hierarchy), `indicatesRemedy` (graded: 1st/2nd/3rd degree) |
| `Remedy` | A homeopathic remedy | `sourceKingdom` (plant/mineral/animal), `complementaryTo`, `antidotedBy`, `followsWellAfter`, `hasKeynote` |
| `Case` | A patient episode's symptom totality | `hasSymptom` (weighted set), `resultedInPrescription`, `hasOutcome` |
| `Prescription` | A specific remedy+potency+date decision | `ofRemedy`, `forCase`, `byPractitioner` |
| `Outcome` | A follow-up result | `improvementLevel`, `notes`, `recordedAt` |
| `Modality` | Aggravation/amelioration factor | `type` (thermal, time-of-day, positional, etc.), `polarity` |

### 3.2 Why ontology-first, not schema-first

A conventional relational schema for "symptoms" and "remedies" would flatten exactly the relationships (hierarchy, grading, complementarity) that homeopathic reasoning depends on. The ontology is designed first; the operational relational/document schema (§6) is a *projection* of this ontology optimized for transactional access, not a competing model. This ordering — ontology before database schema — is a direct consequence of the inside-out design philosophy: the knowledge representation is closer to the core than any operational data store.

### 3.3 Knowledge acquisition pipeline

1. **Digitize** trusted repertories/materia medica (licensing-permitting; see §4.1 on data sourcing) into the rubric hierarchy and remedy grading structure.
2. **Validate** structure with domain experts (homeopathic practitioners) using ontology-consistency tooling (e.g., OWL reasoner for contradiction checks, SHACL shape validation for completeness).
3. **Version** the knowledge base like code (see §5.4) so that a remedy recommendation can always be traced to "which knowledge-base version produced this."

---

## 4. Data Requirements & Strategy

### 4.1 Knowledge sources

- **Classical repertories**: Kent's Repertory, Boenninghausen's Therapeutic Pocket Book, Synthesis/Complete Repertory-style modern compilations. Licensing status varies by edition — many pre-1923 classical texts (Kent, Boenninghausen, Hering, Allen, Clarke) are in the public domain in most jurisdictions and are the safest, highest-value starting point; modern computerized repertories (e.g., Synthesis, RADAR content) are commercially licensed and would require explicit licensing agreements — this must be a legal/procurement task before ingestion, not an engineering assumption.
- **Materia medica**: Hering's Guiding Symptoms, Kent's Lectures on Materia Medica, Allen's Encyclopedia, Boericke's Materia Medica with Repertory — largely public-domain classical sources.
- **Organon of Medicine (Hahnemann)**: source for foundational reasoning principles (hierarchy of symptoms, totality concept) — public domain.

### 4.2 Publicly available structured datasets

There is **no existing large-scale public dataset of homeopathic case totality → remedy → outcome** suitable for direct ML training. This is expected and should be stated plainly rather than papered over. What *does* exist:
- Digitized public-domain repertory/materia medica **text** (structure must be extracted, not assumed to be pre-structured).
- Scattered, small published case-report collections (journals, practitioner case studies) — useful for qualitative validation and seeding synthetic examples, not for training at scale.

### 4.3 Data collection strategy (building the platform's own dataset)

Since no adequate case-outcome dataset exists externally, the platform's central data asset must be **grown deliberately through usage**, with explicit design choices to make that growth high-quality rather than incidental:

1. **Structured intake by design**: the intake workflow (§7) must capture symptoms as ontology-linked, weighted, polarity-tagged entries — not free text alone — so that every case entered is immediately usable as training/reference data, not requiring later cleanup.
2. **Mandatory, structured outcome capture**: the follow-up workflow must force a structured improvement rating and optionally a practitioner note at every follow-up, tied to the specific prescription, with no way to skip it silently (soft nudges/reminders, not full technical blocking, to respect clinical workflow realities).
3. **Practitioner correction capture**: whenever a practitioner overrides or edits an auto-suggested rubric mapping or remedy ranking, log the correction as a labeled training signal ("system suggested X, practitioner chose Y, because Z") — this is one of the highest-value, lowest-volume-requirement data sources because it's a direct expert supervision signal.
4. **De-identification by default**: all case data used for cross-practitioner learning (case-similarity, ML ranking) must be stripped of direct identifiers at the point of use for those features, governed by an explicit consent and data-governance policy (see §11 risk section) — this is a compliance requirement, not optional engineering polish.

### 4.4 Data preprocessing, annotation, and rollout thresholds

| Data volume milestone | What becomes viable |
|---|---|
| 0 cases | Symbolic engine (2.1/2.2) only, fully functional from day one using licensed/public-domain knowledge. |
| Low hundreds of cases | Case-similarity retrieval (2.3) starts adding value, heavily human-reviewed; used as a "see similar cases" aid, not a ranking input yet. |
| Low thousands of outcome-labeled cases | Classical ML ranking calibration (2.4) becomes trainable and should be A/B evaluated against the symbolic baseline before promotion. |
| Tens of thousands+ with demonstrated ML plateau | Revisit deep learning (2.5) investment, only if justified by measured gains. |

### 4.5 Synthetic data generation

Synthetic cases (generated by sampling plausible symptom combinations consistent with known remedy pictures, reviewed by domain experts) can help **stress-test the reasoning engine and UI** early, but must be clearly flagged as synthetic in the data model and **excluded from real case-similarity retrieval and any outcome-based ML training** to avoid contaminating the empirical case base with non-real outcomes.

### 4.6 Validation strategy for data quality

- Domain-expert spot audits of a sampling of structured intakes vs. original consultation notes.
- Ontology-consistency checks (no contradictory gradings, no orphaned rubrics).
- Outcome-capture completion-rate monitoring as an operational KPI (§10), because a decision-support system that doesn't close the feedback loop degrades into a static lookup tool.

### 4.7 Known limitations to state explicitly (not hide)

- Small early data volume means case-similarity and ML components will have limited value in year one — the roadmap and stakeholder expectations must reflect this rather than overpromise "AI-driven personalization" before there is data to support it.
- Homeopathic outcome labeling is inherently subjective (practitioner-assessed improvement) — this is a domain characteristic, not an engineering defect, but must be modeled as such (e.g., capture practitioner confidence, not just a binary label).

---

## 5. Supporting Services Layer

These are the services the Core Intelligence Layer needs to run reliably in production. They exist *for* the core, not the other way around.

### 5.1 Knowledge Graph Store
Graph database (e.g., Neo4j, or an RDF triple store if OWL reasoning is prioritized) hosting the ontology from §3. Provides: rubric hierarchy traversal, remedy relationship queries, graph-constrained similarity guardrails for §2.3.

### 5.2 Vector Index Service
ANN index (e.g., HNSW-based store) over case embeddings and rubric/materia-medica text embeddings. Provides: case-similarity candidates, free-text-to-rubric suggestion candidates. Must expose a re-indexing job as a first-class operation (triggered on embedding model upgrades or bulk knowledge-base updates).

### 5.3 Reasoning/Ranking Service
Stateless service implementing the reconciliation and ranking logic of §2.8. Consumes graph store + vector index + (later) the ML ranking model; produces the evidence object consumed by the explanation layer.

### 5.4 Knowledge & Model Versioning Service
Every recommendation must be traceable to: which knowledge-graph version, which embedding-model version, and (later) which ranking-model version produced it. This is a non-negotiable requirement for a clinical decision-support system's auditability, not a nice-to-have.

### 5.5 Outcome & Feedback Pipeline
Ingests structured follow-up data and practitioner corrections (§4.3), writes to the case corpus, and triggers periodic retraining/recalibration jobs for the ML ranking component once thresholds (§4.4) are met.

### 5.6 Explanation Generation Service (LLM-backed, grounded)
Takes the Reasoning Service's evidence object (which rubrics matched, which similar cases, with what outcomes) and produces natural-language explanation text and free-text-intake suggestions. Architecturally isolated so that a provider/model swap never touches the reasoning logic, and constrained via retrieval-grounded prompting so it cannot introduce facts absent from the evidence object.

### 5.7 Audit & Compliance Logging Service
Immutable log of every recommendation shown, every override, every outcome recorded, tied to versioning (§5.4). Required for clinical accountability and for any future regulatory conversation.

---

## 6. Data Model (operational projection of the ontology)

A relational/document hybrid is recommended: relational for transactional integrity (patients, prescriptions, appointments), document store or graph for flexible case/symptom structures.

**Core entities (illustrative, not exhaustive):**

- `patients` (demographics, identifiers, consent flags)
- `cases` (episode-level: linked patient, status, created_by, knowledge-base version at intake)
- `case_symptoms` (case_id, rubric_id [FK to knowledge graph], weight, polarity, modality, free-text-origin flag)
- `prescriptions` (case_id, remedy_id, potency, dosage_instructions, prescribed_by, prescribed_at, ranking_evidence_ref)
- `outcomes` (prescription_id, improvement_level, practitioner_notes, recorded_at)
- `corrections` (context, system_suggestion, practitioner_choice, reason, timestamp) — the high-value supervision signal from §4.3
- `kb_versions` / `model_versions` (immutable version records referenced by every recommendation for auditability)

---

## 7. Operational Modules (rebuilt as intelligence producers/consumers)

The clinical workflow from the vision document is *not discarded* — it is re-framed so each stage's engineering purpose is explicit:

| Workflow Stage | Engineering role |
|---|---|
| Patient Registration | Creates the `patient` record the case will attach to; minimal by design. |
| Patient Consultation / Medical History | Structured capture feeding `case_symptoms` and case metadata; this is the most engineering-critical UI because bad capture here degrades everything downstream. |
| Symptoms Assessment | Where free-text-to-rubric suggestion (vector + LLM, human-confirmed) is surfaced. |
| Physical Examination | Structured findings, optionally linked as particulars/generals. |
| Case Analysis | Triggers the Reasoning/Ranking Service; surfaces ranked, explained candidates. |
| Remedy Selection / Prescription | Practitioner decision captured with full evidence-and-version traceability (§5.4). |
| Patient Counseling / Medicine Dispensed | Administrative-adjacent; low intelligence dependency, but still logs into the case timeline. |
| Follow-Up Appointment | Triggers structured Outcome capture (§5.5) — the "retain" step of the CBR cycle. |
| Progress Evaluation branch | If improvement: outcome retained as positive precedent. If no improvement: reassessment re-invokes Case Analysis with the new information, and the prior prescription's outcome is retained as a negative/partial precedent — both are equally valuable data. |

Each module's UI/API surface is designed to make the *correct* structured data the path of least resistance for the practitioner, since data quality at capture time is the single biggest determinant of the intelligence layer's long-term quality.

---

## 8. External Interfaces

Outermost, most replaceable layer — deliberately thin.

- **Practitioner Web/Desktop App**: primary interface to the operational modules; consumes the Reasoning Service's output via the API layer, never talks to the graph/vector stores directly.
- **API Layer**: REST/GraphQL gateway exposing versioned endpoints (`/cases`, `/cases/{id}/analysis`, `/prescriptions`, `/outcomes`) fronting the internal services; all clinical-recommendation endpoints must return the evidence object and version metadata alongside the ranked list, never a bare list — this is an API design consequence of §5.4/§5.7, not a preference.
- **Admin/Clinic Management Surfaces**: scheduling, billing-adjacent, multi-practitioner clinic administration — explicitly the *least* intelligence-coupled layer, built last, and swappable without touching anything in §2–§6.
- **Future integration points**: export to conventional-medicine interoperability standards (e.g., FHIR) if the platform ever needs to sit alongside conventional EHR systems — deliberately deferred, not designed for prematurely.

---

## 9. Implementation Roadmap

**Phase 0 — Knowledge foundation (no user-facing product yet)**
Digitize/license repertory + materia medica; build ontology (§3); stand up graph store (§5.1); validate with domain experts. *Exit criterion: a domain expert can query the graph and get correct rubric→remedy gradings matching the source texts.*

**Phase 1 — Symbolic reasoning core**
Build rule-based engine (§2.1) over the graph; build the versioning (§5.4) and audit logging (§5.7) services from the start, not retrofitted later. *Exit criterion: given a structured symptom set, the system reproduces a manually-repertorized result for a benchmark set of textbook cases.*

**Phase 2 — Minimal operational loop**
Build structured case intake and case-analysis UI (thin) directly on top of Phase 1; no case-similarity yet (no data exists). Ship to a small pilot group of practitioners. *Exit criterion: pilot practitioners can complete the full registration→prescription loop and the system's rankings are judged clinically reasonable by domain experts.*

**Phase 3 — Outcome loop closure**
Build follow-up/outcome capture (§5.5) and correction logging; this is the phase where the platform starts accumulating its proprietary dataset. *Exit criterion: outcome-capture completion rate on pilot cases exceeds an agreed threshold (e.g., 80%).*

**Phase 4 — Case-similarity augmentation**
Once a few hundred outcome-labeled cases exist, add the vector index (§5.2) and case-similarity path (§2.3), guarded by ontology constraints; present as an *additional* "similar past cases" panel, not yet blended into ranking. *Exit criterion: practitioner feedback indicates similar-case suggestions are relevant ≥X% of the time (measured, not assumed).*

**Phase 5 — Free-text intake & grounded explanation**
Introduce the LLM-backed explanation/intake-assist service (§5.6), strictly scoped per §2.6. *Exit criterion: generated explanations are verified by audit sampling to contain zero unsupported claims against the evidence object.*

**Phase 6 — ML-calibrated ranking**
Once the low-thousands outcome-labeled threshold (§4.4) is met, train and A/B test the classical ML ranker (§2.4) against the symbolic-only baseline before promoting it into production ranking.

**Phase 7 — Scale-out & multi-clinic**
Build out full operational/admin modules (§7 non-core stages, §8 admin surfaces) for multi-practitioner, multi-clinic deployment, since by this point the core has been validated independently of scale concerns.

*(Deep learning, §2.5, is explicitly not a phase — it is a future re-evaluation trigger contingent on Phase 6's measured plateau, per §4.4.)*

---

## 10. Testing & Validation Methodology

- **Knowledge-layer testing**: golden-set regression tests — a curated set of textbook cases with known "correct" repertorization results, run against the graph/rule engine on every knowledge-base version change.
- **Reasoning-layer testing**: unit tests on the reconciliation/ranking logic in isolation from any specific knowledge content (using synthetic fixtures); property-based tests (e.g., "a case that is a strict superset of another case's symptoms should never rank a remedy strictly lower").
- **Explanation-grounding testing**: automated checks that every claim in generated explanation text has a corresponding entry in the evidence object (a factual-consistency check specific to §5.6's constraint), plus human audit sampling.
- **Data-quality testing**: outcome-capture completion-rate monitoring, ontology-consistency validation jobs (§4.6), correction-log volume/trend monitoring as a leading indicator of intake UI problems.
- **Clinical validation**: structured review cycles with domain-expert practitioners at every phase exit criterion in §9 — this is not optional QA, it is the actual acceptance criterion for a clinical tool, and should be budgeted into the roadmap as real practitioner time, not an afterthought.
- **ML validation (Phase 6+)**: held-out temporal validation (train on earlier cases, validate on later ones, never randomly shuffled — outcome data is time-ordered and leakage-prone otherwise), calibration checks (predicted vs. observed improvement rates), and mandatory A/B comparison against the symbolic baseline before any promotion.

---

## 11. Scalability, Technical Risk, and Future Extensibility

### 11.1 Scalability
The knowledge graph and rule engine scale comfortably to the domain's natural size (tens of thousands of rubrics, thousands of remedies) on modest infrastructure. The growth axis to actually plan for is the **case corpus and vector index**, which will scale with adoption; ANN indexes chosen in §5.2 are selected specifically because they scale sub-linearly. Multi-clinic/multi-tenant scaling should isolate patient-identifiable data per tenant while allowing the *de-identified* case-similarity and ML layers to optionally learn across tenants under explicit data-sharing agreements — a governance decision, not just a technical one.

### 11.2 Technical risks

| Risk | Mitigation |
|---|---|
| LLM hallucination bleeding into clinical recommendations | Hard architectural isolation (§2.6, §5.6): LLM never originates ranked recommendations, only explains a pre-computed evidence object; automated grounding checks (§10). |
| Sparse/cold-start data undermining case-similarity and ML value | Phased rollout with explicit data thresholds (§4.4); symbolic engine is fully functional without any case data, so the product is never blocked on data volume. |
| Ontology/knowledge-base licensing exposure | Legal review of repertory/materia medica sources before ingestion (§4.1); prefer public-domain classical sources for v1. |
| Practitioner distrust of "black box" suggestions | Every recommendation is traceable to explicit rubric matches or precedent cases (§2.8 design constraint), never opaque. |
| Data quality degradation from poor intake UX | Intake and outcome-capture workflows engineered as the highest-priority UI surfaces (§7), with correction-logging as a built-in quality signal. |
| Regulatory/compliance ambiguity (clinical decision-support software) | Audit logging (§5.7) and versioning (§5.4) built in from Phase 1, not retrofitted, so the system is audit-ready whenever a regulatory conversation arises. |

### 11.3 Future extensibility
The ontology-first design (§3) means new knowledge types (e.g., additional repertories, cross-references to conventional medicine ontologies, remedy-interaction knowledge) extend the graph without breaking existing structure. The strict service boundaries in §5 mean the embedding model, the LLM provider, and even the ML ranking algorithm can each be swapped independently without touching the others, provided their input/output contracts (the evidence object, the versioning metadata) are preserved. This is the direct payoff of having designed from the core outward: every later layer was built to depend on stable contracts from the layer beneath it, rather than the reverse.

---

## 12. Summary

The engineering center of gravity for this platform is not its clinic-management workflow but a **neuro-symbolic, case-based reasoning core**: an ontology-grounded knowledge graph and rule engine for codified homeopathic knowledge, augmented by ontology-guarded vector similarity search over a deliberately and carefully grown proprietary case corpus, calibrated over time by classical machine learning once sufficient outcome data exists, and presented through an LLM that is architecturally forbidden from originating clinical facts. Every operational module and every external interface exists solely to feed this core clean, structured data or to carry its explainable output back to the practitioner who remains the final decision-maker. Building in this order — knowledge and reasoning first, workflow and interface last — is not a stylistic preference; it is the only order in which the system's central value proposition can be validated before resources are spent on the layers that merely surround it.
