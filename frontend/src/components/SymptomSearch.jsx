import React, { useState, useEffect, useRef, useCallback } from 'react'
import { searchRubrics } from '../api/client'

const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

// Simple debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function SymptomSearch({ onSelect, disabled }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const debouncedQuery = useDebounce(query, 280)

  // Fetch rubrics when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    searchRubrics(debouncedQuery, null, 20)
      .then(data => {
        setResults(data)
        setOpen(true)
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(rubric) {
    onSelect(rubric)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <SearchIcon />
      <input
        className="input"
        style={{ paddingLeft: '36px' }}
        type="text"
        placeholder="Search rubrics… e.g. &quot;anxiety night&quot;, &quot;burning pain&quot;"
        value={query}
        onChange={e => setQuery(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        id="rubric-search-input"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)' }}>
          <div className="spinner" style={{ width: 16, height: 16 }} />
        </div>
      )}

      {open && (
        <div className="search-dropdown">
          {results.length === 0 ? (
            <div className="search-empty">No rubrics found for "{debouncedQuery}"</div>
          ) : (
            results.map(r => (
              <div
                key={`${r.abbrev}-${r.id}`}
                className="search-dropdown-item"
                onMouseDown={() => handleSelect(r)}
                role="option"
              >
                <span className="rubric-path">{r.fullpath || r.textt}</span>
                <span className="rubric-edition">{r.abbrev}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
