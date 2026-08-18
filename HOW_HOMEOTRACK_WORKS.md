# How HomeoTrack Works: Simple Guide to Database & Intelligence Logic

Welcome to the simple guide for **HomeoTrack**! This document explains how the project works, what data is stored in the database, and the exact step-by-step logic behind the intelligent system—without getting bogged down in backend code, web servers, or technical jargon.

---

## 1. High-Level Concept: What is HomeoTrack?

Think of **HomeoTrack** as a **smart clinical decision assistant** for Homeopathic Practitioners. 

When a doctor consults a patient, finding the right remedy (*simillimum*) requires searching through thousands of symptoms across classical repertories (like Kent's Repertory) and analyzing the patient's entire state—mind, generals, and body.

HomeoTrack combines two things:
1. **100+ years of classical homeopathic book knowledge** (Repertories & Materia Medica).
2. **Real clinic experience** (remembering every past patient treated, what remedy was given, and whether they got better).

---

## 2. What is the Database Thing? (Data & Storage)

The database in HomeoTrack is the central storehouse. It stores 4 main categories of information:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           HOMEOTRACK DATABASE                           │
├──────────────────────────────────┬──────────────────────────────────────┤
│ 1. Classical Knowledge           │ 2. Clinical Patient Cases            │
│    • Repertory Rubrics           │    • Patient Complaints & Totality    │
│    • Remedy Catalogs             │    • Symptom Hierarchies & Modalities│
│    • Rubric-Remedy Matrix (1-4°) │    • Prescribed Remedies & Potencies  │
│    • Materia Medica Narratives   │                                      │
├──────────────────────────────────┼──────────────────────────────────────┤
│ 3. Real-World Outcomes           │ 4. Semantic Search Vectors           │
│    • Cured / Improved / Failed   │    • Smart Math Embeddings for free  │
│    • Practitioner Annotations    │      text search to rubric mapping    │
└──────────────────────────────────┴──────────────────────────────────────┘
```

### A. Classical Knowledge Base (Digitized Books)
* **Rubrics Table**: Thousands of classified homeopathic symptoms organized hierarchically (e.g., `Mind -> Fear -> evening in bed`).
* **Remedies Table**: Master list of homeopathic remedies (e.g., *Arsenicum Album*, *Nux Vomica*, *Lycopodium*, *Belladonna*).
* **Rubric-Remedy Matrix (`RubricRemedy`)**: The links connecting remedies to symptoms, including the remedy grade/degree (1st, 2nd, 3rd, or 4th degree rating).
* **Materia Medica Tables**: Detailed narrative descriptions of remedy pictures (how remedies affect mind, body, and senses).

### B. Patient Cases & Symptoms
* **Cases Table**: Stores consultation episodes (Patient name, age, gender, chief complaint, date).
* **Case Symptoms Table**: The patient's symptom totality recorded during consultation, tagged with:
  * **Hierarchy**: Mental General, Physical General, or Particular.
  * **Modality**: Conditions that make symptoms better or worse (e.g., *worse by heat*, *better by cold*, *3 AM aggravation*).
  * **Intensity**: How severe the symptom is for the patient (1 to 3).

### C. Prescriptions & Outcomes (The Learning Signal)
* **Prescriptions Table**: Records which remedy, potency (e.g., *30C*, *200C*, *1M*), and instructions were given.
* **Outcomes Table**: Stores follow-up results (*Marked Improvement*, *Partial Relief*, *No Change*, *Aggravated*).

### D. Semantic Embeddings (Vector Index)
* Converts free-text patient descriptions into mathematical vectors so the computer can match conversational phrasing ("anxious at bedtime") to exact classical rubrics (*Mind - Anxiety - bed, in*).

---

## 3. What is the Logic Behind the Intelligent System?

The intelligence behind HomeoTrack uses a **Hybrid Reasoning Engine** (combining **Symbolic Classical Repertorization** + **Case-Based Similarity Search** + **Feedback Learning**).

Here is the complete step-by-step flow of how the intelligent system processes a patient case:

```
[Patient Narrative / Symptoms]
            │
            ▼
┌─────────────────────────┐
│ STEP 1: Intake &        │ ── Maps patient text to official repertory rubrics
│ Normalization           │    using smart semantic matching
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ STEP 2: Homeopathic     │ ── Applies classical weight multipliers:
│ Weighting               │    Mental Generals > Physical Generals > Particulars
└───────────┬─────────────┘    + Modality multipliers
            │
            ├────────────────────────────────────────┐
            ▼                                        ▼
┌─────────────────────────┐              ┌─────────────────────────┐
│ STEP 3A: Classical      │              │ STEP 3B: Case Similarity│
│ Repertorization (Books) │              │ Precedent (Past Cases)  │
│ Multiplies Degrees &    │              │ Finds past similar cases│
│ Symptom Weights         │              │ & checks what worked    │
└───────────┬─────────────┘              └───────────┬─────────────┘
            │                                        │
            └────────────────────┬───────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ STEP 4: Reconciliation  │ ── Merges book scores with
                    │ & Ranking               │    historical success rates
                    └───────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ STEP 5: Transparent     │ ── Generates clear explanation:
                    │ Explanation             │    Symptom coverage % & proof
                    └───────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ STEP 6: Practitioner    │ ── Doctor confirms prescription
                    │ Prescription            │
                    └───────────┬─────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ STEP 7: Outcome Loop    │ ── Patient follow-up saved;
                    │ (Self-Learning)         │    system gets smarter!
                    └─────────────────────────┘
```

---

### Step-by-Step Breakdown of the Intelligent Logic

#### **Step 1: Symptom Intake & Normalization (Text to Rubrics)**
* **Problem**: A patient says *"I feel terrible anxiety when it gets dark outside"*.
* **Logic**: The intelligent engine uses semantic vector search to find matching repertory rubrics:
  * `Mind - Anxiety - evening`
  * `Mind - Fear - dark; of`
* The practitioner confirms or adjusts these rubrics.

#### **Step 2: Homeopathic Hierarchy & Modality Weighting**
In homeopathy, not all symptoms carry equal weight. The intelligent engine assigns multipliers based on homeopathic principles (e.g., Kent's methodology):
1. **Mental Generals** (Mental state, emotional causes) $\rightarrow$ **Highest Weight (Multiplier: 3.0x)**
2. **Physical Generals** (Thirst, sleep, weather sensitivities) $\rightarrow$ **Medium Weight (Multiplier: 2.0x)**
3. **Particular Symptoms** (Specific organ/location pain) $\rightarrow$ **Standard Weight (Multiplier: 1.0x)**
4. **Modalities & Peculiarities** (What aggravates/relieves) $\rightarrow$ **Refinement Multiplier**

#### **Step 3: Two-Path Intelligence Search**
The system runs two distinct checks simultaneously:

* **Path 3A: Classical Book Lookup (Symbolic Engine)**
  * For every candidate remedy, the system calculates a score:
    $$\text{Score} = \sum (\text{Remedy Degree [1 to 4]} \times \text{Symptom Intensity} \times \text{Hierarchy Multiplier} \times \text{Modality Multiplier})$$
  * Remedies are ranked by how many rubrics they cover and their total weighted score.

* **Path 3B: Past Real Case Similarity (Case-Based Reasoning - CBR)**
  * The system searches the clinic's database of past cases for patients with similar symptom profiles.
  * **Safety Guardrail**: Modalities must match! If a past case was *"better by heat"*, it will NOT be matched to a patient who is *"worse by heat"*.
  * It retrieves what remedy was given to those similar patients and whether the patient was cured.

#### **Step 4: Reconciliation & Multi-Path Ranking**
* The system merges the results of **Path 3A (Book Knowledge)** and **Path 3B (Real Experience)**.
* **Example**:
  * Remedy *Arsenicum Album* covers 8 out of 9 rubrics in the books (High Book Rank).
  * In 5 past clinic cases with similar anxiety and warmth modalities, *Arsenicum Album* resulted in 90% improvement (High Clinical Rank).
  * Therefore, *Arsenicum Album* reaches the **#1 recommendation spot**.

#### **Step 5: Transparent Explanation (No Black Box / No Hallucinations)**
* The AI **never makes up facts**. 
* It produces a clear explanation for the practitioner:
  > **Recommended Remedy: Arsenicum Album**
  > * **Rubric Coverage**: Covers 8 / 9 symptoms (88.9%).
  > * **Key Mental Generals Covered**: `Mind - Anxiety - night`, `Mind - Restlessness`.
  > * **Past Case Match**: 4 past similar cases treated with 85% positive outcome.

#### **Step 6 & 7: Practitioner Decision & The Self-Learning Feedback Loop**
* The practitioner stays in control and makes the prescription.
* Weeks later, when the patient returns, the doctor records the outcome (*Cured* or *Improved*).
* **This closes the loop**: The outcome is stored in the database. The next time a new patient arrives with similar symptoms, the intelligence path is automatically smarter!

---

## Summary Table: Database vs. Intelligence

| Aspect | What is it in HomeoTrack? |
| :--- | :--- |
| **The Database** | Stores digital repertories, Materia Medica, patient cases, prescriptions, outcomes, and vector search embeddings. |
| **The Intelligence** | Translates free text to rubrics $\rightarrow$ applies Kent's homeopathic weighting $\rightarrow$ searches classical books + past patient cases $\rightarrow$ ranks remedies with transparent explanations $\rightarrow$ learns from follow-up outcomes. |
