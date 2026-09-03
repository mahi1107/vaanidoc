const API_BASE = '/api';
const TOKEN_KEY = 'vaanidoc_token';
const USER_KEY = 'vaanidoc_user';
const SESSION_CASES_KEY = 'vaanidoc_session_cases';

// ── Auth helpers ─────────────────────────────────────────────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_CASES_KEY);
  sessionStorage.removeItem(SESSION_CASES_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated() {
  return !!getToken();
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch(url, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getToken();
  
  const headers = isFormData 
    ? (token ? { 'Authorization': `Bearer ${token}` } : {})
    : { ...authHeaders(), ...(options.headers || {}) };

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401) {
    removeToken();
    window.dispatchEvent(new CustomEvent('vaanidoc:unauthorized'));
    throw new Error('Unauthorized — please sign in.');
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errBody.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────
export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json();
  setToken(data.access_token);
  setStoredUser(data.user);
  return data;
}

export async function patientLogin(phoneNumber, password = 'patient123') {
  const res = await fetch(`${API_BASE}/auth/patient-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, password })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Patient login failed' }));
    throw new Error(err.detail || 'Patient login failed');
  }
  const data = await res.json();
  setToken(data.access_token);
  setStoredUser(data.user);
  return data;
}

export async function patientRegister(payload) {
  const res = await fetch(`${API_BASE}/auth/patient-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  const data = await res.json();
  setToken(data.access_token);
  setStoredUser(data.user);
  return data;
}

export function logout() {
  removeToken();
  clearPatientSessionCodes();
}

export async function fetchAuthStatus() {
  const res = await fetch(`${API_BASE}/auth/status`);
  if (!res.ok) return { auth_required: false };
  return res.json();
}

export async function fetchCurrentUser() {
  return apiFetch(`${API_BASE}/auth/me`);
}

export async function updatePatientProfile(payload) {
  return apiFetch(`${API_BASE}/auth/patient/profile`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deletePatientAccount() {
  return apiFetch(`${API_BASE}/auth/patient/account`, {
    method: 'DELETE'
  });
}

// ── Voice Consultations & Speech Processing ───────────────────────
export async function processBrowserAudio(formData) {
  return apiFetch(`${API_BASE}/calls/process-audio`, {
    method: 'POST',
    body: formData
  });
}

export async function startVoiceConsultation(payload) {
  return apiFetch(`${API_BASE}/calls/consultation`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function simulateCall(payload) {
  return apiFetch(`${API_BASE}/calls/simulate`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ── Cases Management ──────────────────────────────────────────────
export async function fetchCases(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/cases${query ? '?' + query : ''}`);
}

/**
 * Patient-isolated case fetching. Guarantees a patient only sees their own data.
 * For authenticated patients, the backend extracts identity directly from verified JWT Bearer token.
 * For anonymous patients, active session case_codes are supplied.
 */
export async function fetchPatientCases(caseCodesOrPatientId, maybeCaseCodes) {
  let codes = [];
  if (Array.isArray(caseCodesOrPatientId)) {
    codes = caseCodesOrPatientId;
  } else if (Array.isArray(maybeCaseCodes)) {
    codes = maybeCaseCodes;
  }

  const params = new URLSearchParams();
  if (codes && codes.length > 0) {
    params.set('case_codes', codes.join(','));
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`${API_BASE}/cases/patient/my-cases${queryString}`);
}

// Session case code helpers (for anonymous patients)
export function getPatientSessionCodes() {
  try {
    const raw = sessionStorage.getItem(SESSION_CASES_KEY) || localStorage.getItem(SESSION_CASES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addPatientSessionCode(code) {
  if (!code) return;
  const current = getPatientSessionCodes();
  if (!current.includes(code)) {
    current.unshift(code);
    const jsonStr = JSON.stringify(current.slice(0, 50));
    sessionStorage.setItem(SESSION_CASES_KEY, jsonStr);
    localStorage.setItem(SESSION_CASES_KEY, jsonStr);
  }
}

export function clearPatientSessionCodes() {
  localStorage.removeItem(SESSION_CASES_KEY);
  sessionStorage.removeItem(SESSION_CASES_KEY);
}

export async function fetchCaseDetail(identifier) {
  return apiFetch(`${API_BASE}/cases/${identifier}`);
}

export async function recordCaseAction(identifier, payload) {
  return apiFetch(`${API_BASE}/cases/${identifier}/action`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function fetchAshaMyWork(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/cases/asha/my-work${query ? '?' + query : ''}`);
}

// ── Healthcare Facilities ─────────────────────────────────────────
export async function fetchFacilities(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/facilities${query ? '?' + query : ''}`);
}

export async function recommendFacility(triageLevel, district) {
  if (!district) return { facility: null, message: 'No district specified' };
  return apiFetch(`${API_BASE}/facilities/recommend?triage_level=${triageLevel}&district=${encodeURIComponent(district)}`);
}

// ── Health Diagnostics ────────────────────────────────────────────
export async function fetchHealth() {
  const res = await fetch('/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

// ── Analytics ─────────────────────────────────────────────────────
export async function fetchTodayOverview(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/today${query ? '?' + query : ''}`);
}

export async function fetchOverviewMetrics(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/overview${query ? '?' + query : ''}`);
}

export async function fetchTriageDistribution(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/triage${query ? '?' + query : ''}`);
}

export async function fetchSymptomTrends(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/symptoms${query ? '?' + query : ''}`);
}

export async function fetchLanguageDistribution(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/languages${query ? '?' + query : ''}`);
}

export async function fetchCallsTimeline(params = { days: 7 }) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/timeline${query ? '?' + query : ''}`);
}

export async function fetchDistrictMetrics(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/analytics/districts${query ? '?' + query : ''}`);
}

// ── Calls Audit ───────────────────────────────────────────────────
export async function fetchCalls(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/calls${query ? '?' + query : ''}`);
}

export async function fetchActiveCalls(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/calls/active${query ? '?' + query : ''}`);
}

export async function fetchCallDetail(callId) {
  return apiFetch(`${API_BASE}/calls/${callId}`);
}

// ── ASHA Workers ──────────────────────────────────────────────────
export async function fetchAshaWorkers(params = {}) {
  const query = typeof params === 'string' ? `?district=${encodeURIComponent(params)}` : new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/asha/workers${query ? (query.startsWith('?') ? query : '?' + query) : ''}`);
}

export async function fetchWorkerDetail(workerId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/asha/workers/${workerId}${query ? '?' + query : ''}`);
}

export async function sendWorkerTestAlert(workerId) {
  return apiFetch(`${API_BASE}/asha/workers/${workerId}/test-alert`, { method: 'POST' });
}

export async function fetchAshaAlerts(params = {}) {
  const query = typeof params === 'string' ? `?district=${encodeURIComponent(params)}` : new URLSearchParams(params).toString();
  return apiFetch(`${API_BASE}/asha/alerts${query ? (query.startsWith('?') ? query : '?' + query) : ''}`);
}

export async function acknowledgeAshaAlert(alertId) {
  return apiFetch(`${API_BASE}/asha/alerts/${alertId}/acknowledge`, { method: 'POST' });
}

// ── Protocols ─────────────────────────────────────────────────────
export async function fetchProtocols() {
  return apiFetch(`${API_BASE}/triage/protocols`);
}

// ── Follow-ups ────────────────────────────────────────────────────
export async function fetchFollowups(paramsOrStatus = '') {
  let query = '';
  if (typeof paramsOrStatus === 'string') {
    query = paramsOrStatus ? `?status=${encodeURIComponent(paramsOrStatus)}` : '';
  } else if (paramsOrStatus && typeof paramsOrStatus === 'object') {
    const q = new URLSearchParams(paramsOrStatus).toString();
    query = q ? `?${q}` : '';
  }
  return apiFetch(`${API_BASE}/followups${query}`);
}

export async function completeFollowup(followupId, payload) {
  return apiFetch(`${API_BASE}/followups/${followupId}/complete`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function rescheduleFollowup(followupId, hours = 24) {
  return apiFetch(`${API_BASE}/followups/${followupId}/reschedule?hours=${hours}`, {
    method: 'POST'
  });
}
