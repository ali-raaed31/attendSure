import { apiGet } from '../../../lib/api'

type CallDetail = {
  call: { id: number; status: string; started_at?: string | null; ended_at?: string | null; fail_reason?: string | null }
  patient: { id: number; name: string; phone: string; doctor_name?: string; appointment_date?: string; appointment_time?: string }
  result?: { summary?: string | null; structured_json?: string | null }
}

export default async function CallDetailPage({ params }: { params: { id: string } }) {
  const data = await apiGet<CallDetail>(`/api/calls/${params.id}`)
  const structured = data.result?.structured_json ? JSON.parse(data.result.structured_json) : null
  const pretty = (obj: any) => JSON.stringify(obj, null, 2)
  const so = structured?.structuredOutputs
  const analysisSD = structured?.analysisStructuredData
  const fmt = (s?: string | null) => {
    if (!s) return '-'
    const d = new Date(s)
    const uk = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'short' }).format(d)
    const utc = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(d)
    return `${uk} (UK) / ${utc} (UTC)`
  }
  return (
    <div className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h2>Call #{data.call.id} — {data.call.status}</h2>
        <p className="muted">Started: {fmt(data.call.started_at)} | Ended: {fmt(data.call.ended_at)}</p>
        {data.call.fail_reason ? <p style={{ color: '#b91c1c' }}>Failed: {data.call.fail_reason}</p> : null}
      </div>
      <div className="card">
        <h3>Patient</h3>
        <p><b>{data.patient.name}</b> — {data.patient.phone}</p>
        <p className="muted">{(data.patient.appointment_date || '-') + ' ' + (data.patient.appointment_time || '')} with {data.patient.doctor_name || '-'}</p>
      </div>
      <div className="card">
        <h3>Result</h3>
        <p>{data.result?.summary || '-'}</p>
        {so ? (
          <div>
            <h4>Structured Outputs</h4>
            <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>{pretty(so)}</pre>
          </div>
        ) : null}
        {analysisSD ? (
          <div style={{ marginTop: 12 }}>
            <h4>Analysis Structured Data</h4>
            <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>{pretty(analysisSD)}</pre>
          </div>
        ) : null}
        {!so && !analysisSD ? (
          <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8 }}>{pretty(structured)}</pre>
        ) : null}
      </div>
    </div>
  )
}


