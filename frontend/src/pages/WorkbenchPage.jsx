import React, { useState, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import SymptomSearch from '../components/SymptomSearch'
import SymptomTag from '../components/SymptomTag'
import RemedyCard from '../components/RemedyCard'
import MateriaPanel from '../components/MateriaPanel'
import { repertorize, createCase } from '../api/client'

// ─── Icons ───────────────────────────────────────────────────
const FlaskIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6l1 9H8L9 3z"/>
    <path d="M6.5 15a5 5 0 0 0 11 0"/>
    <line x1="9" y1="3" x2="9" y2="7"/>
    <line x1="15" y1="3" x2="15" y2="7"/>
  </svg>
)

const SaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
)

const ClearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6l-1 14H6L5 6"/>
  </svg>
)

let _idCounter = 0
function genId() { return ++_idCounter }

// ─── Toast ───────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
      ))}
    </div>
  )
}

// ─── Empty states ─────────────────────────────────────────────
function EmptySymptoms() {
  return (
    <div className="empty-state" style={{ padding: '32px 16px' }}>
      <div className="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h3>No symptoms added</h3>
      <p>Search for a rubric above and add it to the symptom totality.</p>
    </div>
  )
}

function EmptyResults({ hasSymptoms }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4"/>
          <path d="M12 16h.01"/>
        </svg>
      </div>
      <h3>{hasSymptoms ? 'Ready to repertorize' : 'Build your case first'}</h3>
      <p>
        {hasSymptoms
          ? 'Add symptoms and click "Repertorize" to rank candidate remedies using Kent\'s weighted algorithm.'
          : 'Search for rubrics on the left to build a symptom totality, then run repertorization.'}
      </p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function WorkbenchPage() {
  // Patient info
  const [patientName, setPatientName] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')

  // Symptoms list
  const [symptoms, setSymptoms] = useState([])

  // Analysis results
  const [results, setResults] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)

  // Materia Medica panel
  const [mmPanel, setMmPanel] = useState(null) // { remedyId, remedyName }

  // Toast notifications
  const [toasts, setToasts] = useState([])
  const toastRef = useRef(0)

  function showToast(msg, type = 'default') {
    const id = ++toastRef.current
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  // Add a rubric from search
  const handleSelectRubric = useCallback((rubric) => {
    setSymptoms(prev => {
      // Prevent duplicates
      const alreadyIn = prev.some(s => s.rubric_id === rubric.id || s.rubric_id === rubric.rubric_id)
      if (alreadyIn) {
        showToast('This rubric is already in the symptom list.', 'default')
        return prev
      }
      return [
        ...prev,
        {
          _localId: genId(),
          rubric_id: rubric.rubric_id || rubric.id,
          rubric_text: rubric.fullpath || rubric.textt,
          abbrev: rubric.abbrev,
          intensity_weight: 1,
          hierarchy: 'particular',
          modality: 'none',
        }
      ]
    })
  }, [])

  // Update a symptom field
  const handleUpdateSymptom = useCallback((localId, field, value) => {
    setSymptoms(prev =>
      prev.map(s => s._localId === localId ? { ...s, [field]: value } : s)
    )
  }, [])

  // Remove a symptom
  const handleRemoveSymptom = useCallback((localId) => {
    setSymptoms(prev => prev.filter(s => s._localId !== localId))
  }, [])

  // Clear entire case
  function handleClear() {
    setSymptoms([])
    setResults(null)
    setPatientName('')
    setPatientAge('')
    setPatientGender('')
    setChiefComplaint('')
  }

  // Build totality payload
  function buildTotality() {
    return {
      patient_name: patientName.trim() || 'Anonymous Patient',
      chief_complaint: chiefComplaint.trim() || null,
      symptoms: symptoms.map(s => ({
        rubric_id: s.rubric_id,
        rubric_text: s.rubric_text,
        intensity_weight: s.intensity_weight,
        hierarchy: s.hierarchy,
        modality: s.modality,
      })),
    }
  }

  // Run repertorization
  async function handleRepertorize() {
    if (symptoms.length === 0) {
      showToast('Add at least one symptom before repertorizing.', 'error')
      return
    }
    setAnalyzing(true)
    setResults(null)
    try {
      const data = await repertorize(buildTotality(), 25)
      setResults(data)
      if (data.candidates.length === 0) {
        showToast('No remedy candidates found. Try adding more rubrics.', 'default')
      } else {
        showToast(`Found ${data.candidates.length} candidate remedies.`, 'success')
      }
    } catch (e) {
      showToast(`Repertorization failed: ${e.message}`, 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  // Save case
  async function handleSaveCase() {
    if (symptoms.length === 0) {
      showToast('Add symptoms before saving.', 'error')
      return
    }
    try {
      const data = await createCase(
        buildTotality(),
        patientAge ? parseInt(patientAge) : null,
        patientGender || null,
      )
      showToast(`Case saved — ID #${data.case_id}`, 'success')
    } catch (e) {
      showToast(`Save failed: ${e.message}`, 'error')
    }
  }

  // ─── Render ──────────────────────────────────────────────
  const topActions = (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-secondary btn-sm"
        onClick={handleClear}
        disabled={symptoms.length === 0 && !patientName}
        id="clear-case-btn"
      >
        <ClearIcon />
        Clear
      </button>
      <button
        className="btn btn-secondary btn-sm"
        onClick={handleSaveCase}
        disabled={symptoms.length === 0}
        id="save-case-btn"
      >
        <SaveIcon />
        Save Case
      </button>
      <button
        className="btn btn-primary btn-lg"
        onClick={handleRepertorize}
        disabled={analyzing || symptoms.length === 0}
        id="repertorize-btn"
      >
        {analyzing ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <FlaskIcon />}
        {analyzing ? 'Analyzing…' : 'Repertorize'}
      </button>
    </div>
  )

  return (
    <Layout
      title="Clinical Workbench"
      subtitle="Build a symptom totality and run Kent's weighted repertorization"
      actions={topActions}
    >
      <div className="workbench-grid">
        {/* ── LEFT COLUMN: Case Builder ── */}
        <div className="flex flex-col gap-4">

          {/* Patient Info Card */}
          <div className="card">
            <div className="card-header">
              <h3>Patient</h3>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label className="field-label" htmlFor="patient-name">Name <span>(optional)</span></label>
                <input
                  id="patient-name"
                  className="input"
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="patient-age">Age</label>
                  <input
                    id="patient-age"
                    className="input"
                    type="number"
                    placeholder="Years"
                    min="0"
                    max="120"
                    value={patientAge}
                    onChange={e => setPatientAge(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="patient-gender">Gender</label>
                  <select
                    id="patient-gender"
                    className="select"
                    value={patientGender}
                    onChange={e => setPatientGender(e.target.value)}
                  >
                    <option value="">— Select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="chief-complaint">Chief Complaint</label>
                <textarea
                  id="chief-complaint"
                  className="textarea"
                  placeholder="Describe the patient's presenting complaint…"
                  value={chiefComplaint}
                  onChange={e => setChiefComplaint(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Symptom Builder Card */}
          <div className="card">
            <div className="card-header">
              <h3>Symptom Totality</h3>
              {symptoms.length > 0 && (
                <span className="counter-badge">{symptoms.length}</span>
              )}
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Rubric search */}
              <SymptomSearch onSelect={handleSelectRubric} disabled={analyzing} />

              {/* Legend */}
              <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                <span className="pill pill-mental" style={{ fontSize: '0.65rem' }}>Mental General — 2×</span>
                <span className="pill pill-physical" style={{ fontSize: '0.65rem' }}>Physical General — 1.5×</span>
                <span className="pill pill-particular" style={{ fontSize: '0.65rem' }}>Particular — 1×</span>
              </div>

              <div className="divider" />

              {/* Symptom tags list */}
              {symptoms.length === 0 ? (
                <EmptySymptoms />
              ) : (
                <div className="symptom-list">
                  {symptoms.map(s => (
                    <SymptomTag
                      key={s._localId}
                      symptom={{ ...s, id: s._localId }}
                      onUpdate={handleUpdateSymptom}
                      onRemove={handleRemoveSymptom}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Results ── */}
        <div className="flex flex-col gap-4">
          <div className="card" style={{ minHeight: 420 }}>
            <div className="card-header">
              <h3>Remedy Candidates</h3>
              {results && (
                <span className="text-sm text-muted">
                  {results.candidates.length} found · {results.total_symptoms_analyzed} rubrics analyzed
                </span>
              )}
            </div>

            <div className="card-body" style={{ padding: results?.candidates?.length > 0 ? '14px 16px' : 0 }}>
              {analyzing && (
                <div className="loading-row" style={{ justifyContent: 'center', padding: 48 }}>
                  <div className="spinner" />
                  <span>Running Kent's repertorization engine…</span>
                </div>
              )}

              {!analyzing && !results && (
                <EmptyResults hasSymptoms={symptoms.length > 0} />
              )}

              {!analyzing && results && results.candidates.length === 0 && (
                <div className="empty-state">
                  <h3>No candidates found</h3>
                  <p>Try adding more symptom rubrics or checking rubric IDs are valid.</p>
                </div>
              )}

              {!analyzing && results && results.candidates.length > 0 && (
                <div className="remedy-list">
                  {results.candidates.map((c, i) => (
                    <RemedyCard
                      key={c.remedy_id}
                      candidate={c}
                      rank={i + 1}
                      onViewMM={(id, name) => setMmPanel({ remedyId: id, remedyName: name })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Advisory disclaimer */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--cream-50)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--cream-200)',
            fontSize: '0.75rem',
            color: 'var(--stone-400)',
            lineHeight: 1.55,
          }}>
            ⚕️ <strong>Advisory only.</strong> HomeoTrack provides ranked suggestions based on Kent's symbolic repertorization.
            All prescribing decisions must be made by a qualified homeopathic practitioner.
          </div>
        </div>
      </div>

      {/* Materia Medica Panel (portal-style) */}
      {mmPanel && (
        <MateriaPanel
          remedyId={mmPanel.remedyId}
          remedyName={mmPanel.remedyName}
          onClose={() => setMmPanel(null)}
        />
      )}

      {/* Toast container */}
      <Toast toasts={toasts} />
    </Layout>
  )
}
