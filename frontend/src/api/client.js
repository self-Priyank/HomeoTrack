// ─── HomeoTrack API Client ────────────────────────────────
// All backend calls in one place. Base URL is /api (proxied
// to http://127.0.0.1:8000 in dev via vite.config.js).
// ──────────────────────────────────────────────────────────

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `API Error ${res.status}`)
  }
  return res.json()
}

// Search rubrics by keyword (autocomplete)
export function searchRubrics(query, edition = null, limit = 20) {
  const params = new URLSearchParams({ q: query, limit })
  if (edition) params.set('edition', edition)
  return request(`/rubrics/search?${params}`)
}

// Run Kent's repertorization
export function repertorize(totality, limit = 25) {
  return request(`/repertorize?limit=${limit}`, {
    method: 'POST',
    body: JSON.stringify(totality),
  })
}

// Get detailed evidence explanation for a remedy candidate
export function getRemedyExplanation(remedyId, totality) {
  return request(`/remedies/${remedyId}/explanation`, {
    method: 'GET',
    // FastAPI GET with body — send as query param workaround:
    // actually this endpoint expects CaseTotalityInput body via GET
    // We'll POST-style it via body
    body: JSON.stringify(totality),
  })
}

// Get Materia Medica profile for a remedy
export function getMateriaMedica(remedyId) {
  return request(`/materia-medica/${remedyId}`)
}

// Save a consultation case
export function createCase(totality, age = null, gender = null) {
  const params = new URLSearchParams()
  if (age) params.set('age', age)
  if (gender) params.set('gender', gender)
  return request(`/cases?${params}`, {
    method: 'POST',
    body: JSON.stringify(totality),
  })
}

// Retrieve a saved case by ID
export function getCase(caseId) {
  return request(`/cases/${caseId}`)
}
