import React, { useState } from 'react'
import Layout from '../components/Layout'
import { getCase } from '../api/client'

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}>
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

function HierarchyPill({ value }) {
  if (value === 'mental_general')   return <span className="pill pill-mental">Mental General</span>
  if (value === 'physical_general') return <span className="pill pill-physical">Physical General</span>
  return <span className="pill pill-particular">Particular</span>
}

function ModalityPill({ value }) {
  if (value === 'aggravation')  return <span className="pill pill-aggrav">▲ Aggravation</span>
  if (value === 'amelioration') return <span className="pill pill-amelio">▼ Amelioration</span>
  return null
}

function OutcomePill({ level }) {
  const map = {
    'cured':              { cls: 'pill-amelio', label: '✓ Cured' },
    'marked_improvement': { cls: 'pill-physical', label: '↑ Marked Improvement' },
    'partial':            { cls: 'pill-neutral', label: '~ Partial Relief' },
    'no_change':          { cls: 'pill-neutral', label: '= No Change' },
    'aggravated':         { cls: 'pill-aggrav', label: '▲ Aggravated' },
  }
  const m = map[level] || { cls: 'pill-neutral', label: level }
  return <span className={`pill ${m.cls}`}>{m.label}</span>
}

export default function CaseLookupPage() {
  const [caseId, setCaseId] = useState('')
  const [caseData, setCaseData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFetch() {
    const id = parseInt(caseId)
    if (!id) return
    setLoading(true)
    setError(null)
    setCaseData(null)
    try {
      const data = await getCase(id)
      setCaseData(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') handleFetch()
  }

  return (
    <Layout
      title="Case Lookup"
      subtitle="Retrieve a saved patient case by ID"
    >
      {/* Search bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-body" style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="field flex-1">
            <label className="field-label" htmlFor="case-id-input">Case ID</label>
            <input
              id="case-id-input"
              className="input"
              type="number"
              placeholder="Enter case ID number…"
              value={caseId}
              onChange={e => setCaseId(e.target.value)}
              onKeyDown={handleKey}
              min="1"
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleFetch}
            disabled={!caseId || loading}
            id="fetch-case-btn"
          >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <SearchIcon />}
            Fetch Case
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#dc2626',
          fontSize: '0.875rem',
          marginBottom: 20,
        }}>
          ✕ {error}
        </div>
      )}

      {loading && (
        <div className="loading-row" style={{ justifyContent: 'center', padding: 40 }}>
          <div className="spinner" />
          <span>Loading case…</span>
        </div>
      )}

      {caseData && !loading && (
        <div className="case-detail-grid">
          {/* Left: Patient info + Symptoms */}
          <div className="flex flex-col gap-4">

            {/* Patient Info */}
            <div className="card">
              <div className="card-header"><h3>Patient Details</h3></div>
              <div className="card-body">
                <table className="info-table">
                  <tbody>
                    <tr><td>Case ID</td><td><strong>#{caseData.id}</strong></td></tr>
                    <tr><td>Name</td><td>{caseData.patient_name}</td></tr>
                    <tr><td>Age</td><td>{caseData.patient_age ?? '—'}</td></tr>
                    <tr><td>Gender</td><td>{caseData.patient_gender ?? '—'}</td></tr>
                    <tr><td>Created</td><td className="text-sm text-muted">{new Date(caseData.created_at).toLocaleString()}</td></tr>
                    <tr>
                      <td style={{ verticalAlign: 'top', paddingTop: 10 }}>Complaint</td>
                      <td style={{ paddingTop: 10, lineHeight: 1.55, fontSize: '0.875rem' }}>{caseData.chief_complaint || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Symptoms */}
            <div className="card">
              <div className="card-header">
                <h3>Symptoms</h3>
                <span className="counter-badge">{caseData.symptoms.length}</span>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {caseData.symptoms.length === 0 && (
                  <p className="text-sm text-muted">No symptoms recorded.</p>
                )}
                {caseData.symptoms.map(s => (
                  <div key={s.id} style={{
                    padding: '9px 12px',
                    background: 'var(--cream-50)',
                    border: '1px solid var(--cream-200)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                  }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.rubric_text}</div>
                    <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                      <HierarchyPill value={s.hierarchy} />
                      <ModalityPill value={s.modality} />
                      <span className="pill pill-neutral" style={{ fontSize: '0.65rem' }}>
                        Intensity {s.intensity_weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Prescriptions */}
          <div className="card">
            <div className="card-header">
              <h3>Prescriptions & Outcomes</h3>
              {caseData.prescriptions.length > 0 && (
                <span className="counter-badge">{caseData.prescriptions.length}</span>
              )}
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {caseData.prescriptions.length === 0 && (
                <div className="empty-state" style={{ padding: 32 }}>
                  <p className="text-sm text-muted">No prescriptions recorded for this case.</p>
                </div>
              )}
              {caseData.prescriptions.map(rx => (
                <div key={rx.id} className="prescription-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{rx.remedy_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--stone-500)' }}>
                        Potency: <strong>{rx.potency}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--stone-400)' }}>
                      {new Date(rx.prescribed_at).toLocaleDateString()}
                    </div>
                  </div>

                  {rx.notes && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--stone-600)', fontStyle: 'italic' }}>
                      "{rx.notes}"
                    </div>
                  )}

                  {rx.outcomes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--stone-400)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Follow-up Outcomes
                      </div>
                      {rx.outcomes.map(o => (
                        <div key={o.id} className="outcome-row">
                          <OutcomePill level={o.level} />
                          <span className="text-sm text-muted">{new Date(o.recorded_at).toLocaleDateString()}</span>
                          {o.notes && <span className="text-sm text-muted">— {o.notes}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
