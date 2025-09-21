'use client'
import Papa from 'papaparse'
import React from 'react'
import { apiGet, apiPost } from '../../lib/api'
import { useToast } from '../toast'

type Patient = {
  id?: number
  name: string
  gender?: string
  phone: string
  dob?: string
  appointment_date?: string
  appointment_time?: string
  doctor_name?: string
}

export default function ContactsPage() {
  const { push } = useToast()
  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [form, setForm] = React.useState<Patient>({ name: '', phone: '' })
  const [message, setMessage] = React.useState<string | null>(null)
  const [confirmId, setConfirmId] = React.useState<number | null>(null)
  const [sidebarCallId, setSidebarCallId] = React.useState<number | null>(null)
  const [sidebarData, setSidebarData] = React.useState<any>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<Patient[]>('/api/contacts')
      setPatients(data)
    } catch (e: any) {
      setMessage(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { void refresh() }, [refresh])

  function onCSVChange(file: File | null) {
    if (!file) return
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const rows = result.data as any[]
          const res = await apiPost<{ inserted: number; errors: any[] }>('/api/contacts/upload-json', rows)
          setMessage(`Inserted ${res.inserted}, errors ${res.errors.length}`)
          push({ message: `Uploaded CSV: ${res.inserted} inserted, ${res.errors.length} errors`, type: res.errors.length ? 'error' : 'success' })
          void refresh()
        } catch (e: any) {
          setMessage(e.message)
          push({ message: e.message, type: 'error' })
        }
      }
    })
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await apiPost<{ id: number }>('/api/contacts', form)
      setMessage(`Created ${res.id}`)
      push({ message: `Created contact #${res.id}`, type: 'success' })
      setForm({ name: '', phone: '' })
      void refresh()
    } catch (e: any) {
      setMessage(e.message)
      push({ message: e.message, type: 'error' })
    }
  }

  async function confirmCall(patientId: number) {
    setConfirmId(patientId)
  }

  async function launchCallNow(patientId: number) {
    setConfirmId(null)
    try {
      const res = await apiPost<{ callIds: number[] }>("/api/calls/launch", { patientIds: [patientId] })
      const callId = res.callIds?.[0]
      setSidebarCallId(callId)
      push({ message: `Launched call #${callId}`, type: 'success' })
    } catch (e: any) {
      setMessage(e.message)
      push({ message: e.message, type: 'error' })
    }
  }

  React.useEffect(() => {
    let t: any
    if (sidebarCallId) {
      const poll = async () => {
        try {
          const data = await apiGet(`/api/calls/${sidebarCallId}`)
          setSidebarData(data)
          if (data?.call?.status === 'completed' || data?.call?.status === 'failed') return
          t = setTimeout(poll, 5000)
        } catch {
          t = setTimeout(poll, 5000)
        }
      }
      void poll()
    }
    return () => t && clearTimeout(t)
  }, [sidebarCallId])

  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h2>Upload CSV</h2>
        <input type="file" accept=".csv" onChange={(e) => onCSVChange(e.target.files?.[0] || null)} />
      </div>
      <div className="card">
        <h2>Add Contact</h2>
        <form onSubmit={onCreate} className="grid grid-2">
          <div>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label>Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div>
            <label>DOB</label>
            <input type="date" value={form.dob || ''} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
          </div>
          <div>
            <label>Gender</label>
            <select value={form.gender || ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
              <option value="">-</option>
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
          </div>
          <div>
            <label>Doctor Name</label>
            <input value={form.doctor_name || ''} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
          </div>
          <div>
            <label>Appt Date</label>
            <input type="date" value={form.appointment_date || ''} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
          </div>
          <div>
            <label>Appt Time</label>
            <input type="time" value={form.appointment_time || ''} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / span 2' }}>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <h2>Patients {loading ? <span className="muted">(loading...)</span> : null}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <div>
            {patients.map(p => (
              <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eef2f7' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{p.phone} · {(p.appointment_date || '-') + ' ' + (p.appointment_time || '')} · {p.doctor_name || '-'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => confirmCall(p.id!)}>Call</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {confirmId !== null ? (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: 420 }}>
              <h3>Launch call?</h3>
              <p>This will immediately place a call using Vapi. Proceed?</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setConfirmId(null)} style={{ background: '#6b7280' }}>Cancel</button>
                <button onClick={() => launchCallNow(confirmId!)}>Launch</button>
              </div>
            </div>
          </div>
        ) : null}

        {sidebarCallId ? (
          <div style={{ position: 'fixed', top: 56, right: 0, height: 'calc(100vh - 56px)', width: 420, background: 'white', borderLeft: '1px solid #e5e7eb', padding: 16, boxShadow: '-8px 0 24px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Call #{sidebarCallId}</h3>
              <button onClick={() => { setSidebarCallId(null); setSidebarData(null); }} style={{ background: '#6b7280' }}>Close</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                {(!sidebarData || sidebarData?.call?.status === 'in_progress') ? (
                  <span role="img" aria-label="loading" className="spinner" />
                ) : sidebarData?.call?.status === 'completed' ? (
                  <span style={{ color: '#16a34a' }}>✓</span>
                ) : null}
                <span>{sidebarData?.call?.status || 'in_progress'}</span>
              </div>
            </div>
            {sidebarData?.call?.fail_reason ? (
              <div style={{ marginTop: 12 }}>
                <div className="muted">Failure Reason</div>
                <div style={{ color: '#b91c1c' }}>{sidebarData.call.fail_reason}</div>
              </div>
            ) : null}
            <div style={{ marginTop: 12 }}>
              <div className="muted">Summary</div>
              <div>{sidebarData?.result?.summary || '-'}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Structured</div>
              <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8, maxHeight: 240, overflow: 'auto' }}>{sidebarData?.result?.structured_json ? JSON.stringify(JSON.parse(sidebarData.result.structured_json), null, 2) : '-'}</pre>
            </div>
          </div>
        ) : null}
      </div>
      {message ? <div className="card" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>{message}</div> : null}
    </div>
  )
}


