import React from 'react'
import Sidebar from './Sidebar'

export default function Layout({ children, title, subtitle, actions }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="flex flex-col flex-1 min-w-0">
            <h1>{title}</h1>
            {subtitle && <span className="topbar-subtitle">{subtitle}</span>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        {/* Page content */}
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  )
}
