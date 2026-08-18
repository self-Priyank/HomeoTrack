import React, { useState } from 'react'

const ChevronDown = ({ expanded }) => (
  <svg
    className={`remedy-expand-icon ${expanded ? 'expanded' : ''}`}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)

function DegreeBar({ counts }) {
  const degrees = [
    { key: 4, label: '4°', cls: 'pill-degree-4' },
    { key: 3, label: '3°', cls: 'pill-degree-3' },
    { key: 2, label: '2°', cls: 'pill-degree-2' },
    { key: 1, label: '1°', cls: 'pill-degree' },
  ]
  return (
    <div className="remedy-degrees">
      {degrees.map(d => counts[d.key] > 0 && (
        <span key={d.key} className={`pill ${d.cls}`}>
          {counts[d.key]}× {d.label}
        </span>
      ))}
    </div>
  )
}

function EvidenceList({ details }) {
  const sorted = [...details].sort((a, b) => b.weighted_score - a.weighted_score)

  function hierarchyPill(h) {
    if (h === 'mental_general')  return <span className="pill pill-mental" style={{fontSize:'0.65rem',padding:'2px 6px'}}>MG</span>
    if (h === 'physical_general') return <span className="pill pill-physical" style={{fontSize:'0.65rem',padding:'2px 6px'}}>PG</span>
    return <span className="pill pill-particular" style={{fontSize:'0.65rem',padding:'2px 6px'}}>PP</span>
  }

  function modalityPill(m) {
    if (m === 'aggravation')  return <span className="pill pill-aggrav" style={{fontSize:'0.65rem',padding:'2px 5px'}}>▲</span>
    if (m === 'amelioration') return <span className="pill pill-amelio" style={{fontSize:'0.65rem',padding:'2px 5px'}}>▼</span>
    return null
  }

  return (
    <div className="evidence-content">
      {sorted.map((d, i) => (
        <div key={i} className="evidence-row">
          <div className="evidence-row-rubric">{d.rubric_text}</div>
          <div className="evidence-row-meta">
            {hierarchyPill(d.hierarchy)}
            {modalityPill(d.modality)}
            <span className="pill pill-degree">Deg {d.remedy_degree}</span>
          </div>
          <div className="evidence-row-score">+{d.weighted_score.toFixed(1)}</div>
        </div>
      ))}
    </div>
  )
}

export default function RemedyCard({ candidate, rank, onViewMM }) {
  const [expanded, setExpanded] = useState(rank === 1)
  const [activeTab, setActiveTab] = useState('evidence')

  // Count degrees
  const degreeCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }
  candidate.matched_details.forEach(d => {
    degreeCounts[d.remedy_degree] = (degreeCounts[d.remedy_degree] || 0) + 1
  })

  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : ''

  return (
    <div className={`remedy-card ${rankClass}`} id={`remedy-card-${candidate.remedy_id}`}>
      {/* Header (clickable to expand) */}
      <div className="remedy-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="remedy-rank-badge">
          {rank === 1 ? '✦' : `#${rank}`}
        </div>

        <div className="remedy-name-block">
          <div className="remedy-full-name">{candidate.namelong}</div>
          <div className="remedy-abbrev">{candidate.nameabbrev}</div>
        </div>

        <div className="remedy-score-block">
          <div className="remedy-score-value">{candidate.total_score.toFixed(1)}</div>
          <div className="remedy-score-label">score</div>
        </div>

        <ChevronDown expanded={expanded} />
      </div>

      {/* Coverage bar (always visible) */}
      <div className="coverage-bar-wrapper">
        <div className="coverage-bar-label">
          <span>Rubric coverage — {candidate.matched_rubrics_count}/{candidate.total_rubrics_count} symptoms</span>
          <span>{candidate.coverage_pct}%</span>
        </div>
        <div className="coverage-bar">
          <div className="coverage-bar-fill" style={{ width: `${candidate.coverage_pct}%` }} />
        </div>
      </div>

      {/* Degree badges */}
      <DegreeBar counts={degreeCounts} />

      {/* Expanded evidence section */}
      {expanded && (
        <div className="evidence-section">
          <div className="evidence-tabs">
            <button
              className={`evidence-tab ${activeTab === 'evidence' ? 'active' : ''}`}
              onClick={() => setActiveTab('evidence')}
            >
              Evidence Breakdown
            </button>
            <button
              className={`evidence-tab ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Rationale
            </button>
          </div>

          {activeTab === 'evidence' && (
            <EvidenceList details={candidate.matched_details} />
          )}

          {activeTab === 'summary' && (
            <div className="evidence-content">
              <div style={{ fontSize: '0.875rem', color: 'var(--stone-600)', lineHeight: 1.7 }}>
                <strong>{candidate.namelong}</strong> ({candidate.nameabbrev}) covers{' '}
                <strong>{candidate.matched_rubrics_count} of {candidate.total_rubrics_count}</strong> selected rubrics
                with a weighted score of <strong>{candidate.total_score.toFixed(1)}</strong> and{' '}
                <strong>{candidate.coverage_pct}%</strong> totality coverage.
              </div>
              {Object.entries({
                'Mental Generals': candidate.matched_details.filter(d => d.hierarchy === 'mental_general'),
                'Physical Generals': candidate.matched_details.filter(d => d.hierarchy === 'physical_general'),
                'Particular Symptoms': candidate.matched_details.filter(d => d.hierarchy === 'particular'),
              }).map(([label, items]) => items.length > 0 && (
                <div key={label} style={{ marginTop: 8 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--stone-500)', marginBottom: 4 }}>{label}</div>
                  {items.map((d, i) => (
                    <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--stone-700)', paddingLeft: 8, borderLeft: '2px solid var(--cream-200)', marginBottom: 3, lineHeight: 1.4 }}>
                      {d.rubric_text} <span style={{ color: 'var(--stone-400)' }}>(Deg {d.remedy_degree})</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="remedy-action-row">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onViewMM(candidate.remedy_id, candidate.namelong)}
              id={`view-mm-${candidate.remedy_id}`}
            >
              <BookIcon />
              View Materia Medica
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
