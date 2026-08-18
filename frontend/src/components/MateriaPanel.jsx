import React, { useEffect, useState } from 'react'
import { getMateriaMedica } from '../api/client'

const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}>
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

export default function MateriaPanel({ remedyId, remedyName, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setData(null)
    getMateriaMedica(remedyId)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [remedyId])

  return (
    <>
      {/* Overlay */}
      <div className="mm-panel-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="mm-panel" role="dialog" aria-label="Materia Medica">
        <div className="mm-panel-header">
          <div className="mm-panel-title">
            <h2>{remedyName}</h2>
            {data && (
              <p className="text-sm text-muted" style={{ marginTop: 2 }}>
                {data.nameabbrev} · {data.chapters_count} chapter{data.chapters_count !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} id="close-mm-panel">
            <XIcon />
          </button>
        </div>

        <div className="mm-panel-body">
          {loading && (
            <div className="loading-row" style={{ justifyContent: 'center', padding: 40 }}>
              <div className="spinner" />
              <span>Loading Materia Medica…</span>
            </div>
          )}

          {error && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--terra-500)' }}>
              <p style={{ fontSize: '0.875rem' }}>Could not load Materia Medica.</p>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>{error}</p>
            </div>
          )}

          {data && !loading && (
            <>
              {/* Alt names */}
              {data.namealt && (
                <div style={{ padding: '8px 0' }}>
                  <span className="pill pill-neutral" style={{ fontSize: '0.75rem' }}>
                    Also known as: {data.namealt}
                  </span>
                </div>
              )}

              {data.sections.length === 0 && (
                <div className="empty-state">
                  <p>No Materia Medica content found for this remedy in the current database.</p>
                </div>
              )}

              {data.sections.map(s => (
                <div key={s.id} className="mm-section">
                  <div className="mm-section-heading">{s.heading}</div>
                  <div className="mm-section-content">{s.content}</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
