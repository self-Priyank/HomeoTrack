import React from 'react'

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4h6v2"/>
  </svg>
)

const HIERARCHIES = [
  { value: 'mental_general',  label: 'Mental',   shortLabel: 'MG', activeClass: 'active-mental' },
  { value: 'physical_general',label: 'Physical', shortLabel: 'PG', activeClass: 'active-physical' },
  { value: 'particular',      label: 'Particular',shortLabel: 'PP', activeClass: 'active-particular' },
]

const MODALITIES = [
  { value: 'aggravation',  label: '▲ Worse',  activeClass: 'active-aggrav' },
  { value: 'amelioration', label: '▼ Better', activeClass: 'active-amelio' },
  { value: 'none',         label: 'None',     activeClass: 'active-none' },
]

function HierarchyPill({ value }) {
  if (value === 'mental_general')  return <span className="pill pill-mental">Mental General</span>
  if (value === 'physical_general') return <span className="pill pill-physical">Physical General</span>
  return <span className="pill pill-particular">Particular</span>
}

function ModalityPill({ value }) {
  if (value === 'aggravation')  return <span className="pill pill-aggrav">▲ Aggravation</span>
  if (value === 'amelioration') return <span className="pill pill-amelio">▼ Amelioration</span>
  return null
}

export default function SymptomTag({ symptom, onUpdate, onRemove }) {
  const intensityLabels = ['', 'Mild', 'Moderate', 'Strong', 'Keynote']

  return (
    <div className="symptom-tag">
      {/* Top row: rubric text + remove button */}
      <div className="symptom-tag-top">
        <div style={{ flex: 1 }}>
          <div className="symptom-tag-text">{symptom.rubric_text}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--stone-400)', marginTop: 2, fontStyle: 'italic' }}>
            {symptom.abbrev}
          </div>
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => onRemove(symptom.id)}
          title="Remove symptom"
          id={`remove-symptom-${symptom.id}`}
        >
          <TrashIcon />
        </button>
      </div>

      {/* Hierarchy toggle */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--stone-400)', fontWeight: 600, minWidth: 60 }}>Hierarchy</span>
        <div className="pill-toggle">
          {HIERARCHIES.map(h => (
            <button
              key={h.value}
              className={`pill-toggle-option ${symptom.hierarchy === h.value ? h.activeClass : ''}`}
              onClick={() => onUpdate(symptom.id, 'hierarchy', h.value)}
              title={h.label}
            >
              {h.shortLabel}
            </button>
          ))}
        </div>
        <HierarchyPill value={symptom.hierarchy} />
      </div>

      {/* Modality toggle */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--stone-400)', fontWeight: 600, minWidth: 60 }}>Modality</span>
        <div className="pill-toggle">
          {MODALITIES.map(m => (
            <button
              key={m.value}
              className={`pill-toggle-option ${symptom.modality === m.value ? m.activeClass : ''}`}
              onClick={() => onUpdate(symptom.id, 'modality', m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ModalityPill value={symptom.modality} />
      </div>

      {/* Intensity dots */}
      <div className="flex items-center gap-2">
        <span style={{ fontSize: '0.7rem', color: 'var(--stone-400)', fontWeight: 600, minWidth: 60 }}>Intensity</span>
        <div className="intensity-dots">
          {[1, 2, 3, 4].map(i => (
            <button
              key={i}
              className={`intensity-dot ${symptom.intensity_weight >= i ? 'filled' : ''}`}
              onClick={() => onUpdate(symptom.id, 'intensity_weight', i)}
              title={`${intensityLabels[i]}`}
              id={`intensity-${symptom.id}-${i}`}
            />
          ))}
          <span className="intensity-label">{intensityLabels[symptom.intensity_weight]}</span>
        </div>
      </div>
    </div>
  )
}
