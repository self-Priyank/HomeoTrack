import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WorkbenchPage from './pages/WorkbenchPage'
import CaseLookupPage from './pages/CaseLookupPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/cases" element={<CaseLookupPage />} />
        <Route path="/cases/:id" element={<CaseLookupPage />} />
        <Route path="*" element={<WorkbenchPage />} />
      </Routes>
    </BrowserRouter>
  )
}
