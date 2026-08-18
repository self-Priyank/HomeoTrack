import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'

// ─── Icons (inline SVG to avoid icon library dependency) ─────
const IconLeaf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
  </svg>
)

const IconFlask = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6l1 9H8L9 3z"/>
    <path d="M6.5 15a5 5 0 0 0 11 0"/>
    <line x1="9" y1="3" x2="9" y2="7"/>
    <line x1="15" y1="3" x2="15" y2="7"/>
  </svg>
)

const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
)

const IconFolder = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <IconLeaf />
        </div>
        <div className="sidebar-logo-text">
          <span className="brand-name">HomeoTrack</span>
          <span className="brand-sub">CDSS v0.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Clinical</span>

        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <IconFlask />
          <span>Workbench</span>
        </NavLink>

        <NavLink
          to="/cases"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <IconFolder />
          <span>Case Lookup</span>
        </NavLink>

        <span className="sidebar-section-label">Reference</span>

        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="sidebar-nav-item"
        >
          <IconSearch />
          <span>API Docs</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        Kent's Symbolic Engine<br />
        Advisory use only
      </div>
    </aside>
  )
}
