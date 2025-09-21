'use client'
import React from 'react'
import { apiGet, apiPost } from '../../lib/api'

type Patient = {
  id: number
  name: string
  phone: string
  gender?: string
  appointment_date?: string
  appointment_time?: string
  doctor_name?: string
}

type CallJoined = {
  call: { id: number; status: string; scheduled_at?: string | null; started_at?: string | null; ended_at?: string | null; fail_reason?: string | null }
  patient: Patient
  result?: { summary?: string | null; structured_json?: string | null }
}

export default function CallsPage() {
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [selected, setSelected] = React.useState<number[]>([])
  const [calls, setCalls] = React.useState<CallJoined[]>([])
  const [scheduleAt, setScheduleAt] = React.useState<string>('')
  const [statusFilter, setStatusFilter] = React.useState<string>('')
  const [message, setMessage] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    const [p, c] = await Promise.all([
      apiGet<Patient[]>('/api/contacts'),
      apiGet<CallJoined[]>('/api/calls'),
    ])
    setPatients(p)
    setCalls(c)
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])
  React.useEffect(() => {
    const id = setInterval(() => { void refresh() }, 8000)
    return () => clearInterval(id)
  }, [refresh])

  async function launch() {
    if (selected.length === 0) { setMessage('Select at least one patient'); return }
    try {
      const scheduleIso = scheduleAt ? new Date(scheduleAt).toISOString() : undefined
      await apiPost<{ callIds: number[] }>('/api/calls/launch', { patientIds: selected, scheduleAt: scheduleIso })
      setMessage('Launched calls')
      setSelected([])
      void refresh()
    } catch (e: any) {
      setMessage(e.message)
    }
  }

  function toggle(id: number) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h2>Select Patients</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          <button onClick={launch}>Launch Calls</button>
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Phone</th>
              <th>Doctor</th>
              <th>Appt</th>
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} /></td>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>{p.doctor_name || '-'}</td>
                <td>{(p.appointment_date || '-') + ' ' + (p.appointment_time || '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Calls</h2>
        <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">All</option>
            <option value="queued">queued</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Patient</th>
              <th>Success</th>
              <th>Patient Response</th>
              <th>Reason</th>
              <th>Questions</th>
            </tr>
          </thead>
          <tbody>
            {calls.filter(c => !statusFilter || c.call.status === statusFilter).map(c => {
              let success: string | null = null
              let patientResponse: string | null = null
              let reason: string | null = null
              let questions: string | null = null
              try {
                const sj = c.result?.structured_json ? JSON.parse(c.result.structured_json) : null
                const so = sj?.structuredOutputs
                // Try newer structured outputs format first
                if (so && typeof so === 'object') {
                  // Pick first output block if only one is linked
                  const firstKey = Object.keys(so)[0]
                  const result = firstKey ? so[firstKey]?.result : null
                  if (result) {
                    success = String(result.call_success ?? '')
                    patientResponse = result.patient_response ?? null
                    reason = result.reason ?? null
                    if (Array.isArray(result.questions)) questions = result.questions.join(', ')
                  }
                }
                // Fallback to analysisStructuredData if present
                if (!success && sj?.analysisStructuredData) {
                  const r = sj.analysisStructuredData
                  success = String(r.call_success ?? '')
                  patientResponse = r.patient_response ?? null
                  reason = r.reason ?? null
                  if (Array.isArray(r.questions)) questions = r.questions.join(', ')
                }
              } catch {}
              return (
                <tr key={c.call.id}>
                  <td><a href={`/calls/${c.call.id}`}>{c.call.id}</a></td>
                  <td>{c.call.status}</td>
                  <td>{c.patient?.name}</td>
                  <td>{success ?? '-'}</td>
                  <td>{patientResponse ?? '-'}</td>
                  <td>{reason ?? '-'}</td>
                  <td className="muted">{questions ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {message ? <div className="card" style={{ background: '#eff6ff', borderColor: '#93c5fd' }}>{message}</div> : null}
    </div>
  )
}


