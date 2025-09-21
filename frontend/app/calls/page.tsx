'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Phone, Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { apiGet, apiPost } from '@/lib/api'

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Completed</Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</Badge>
      case 'in_progress':
        return <Badge variant="info" className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />In Progress</Badge>
      case 'queued':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-3 h-3" />Queued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return '-'
    const dateStr = time ? `${date} ${time}` : date
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: time ? 'numeric' : undefined,
        minute: time ? '2-digit' : undefined,
      })
    } catch {
      return `${date} ${time || ''}`.trim()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Launch Calls
          </CardTitle>
          <CardDescription>
            Select patients and schedule outbound calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Schedule for later (optional)</label>
              <input 
                type="datetime-local" 
                value={scheduleAt} 
                onChange={(e) => setScheduleAt(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col justify-end">
              <Button onClick={launch} disabled={selected.length === 0} className="h-10">
                Launch {selected.length > 0 ? `${selected.length} ` : ''}Calls
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Appointment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <input 
                      type="checkbox" 
                      checked={selected.includes(p.id)} 
                      onChange={() => toggle(p.id)}
                      className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell>{p.doctor_name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {formatDateTime(p.appointment_date, p.appointment_time)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Call History
          </CardTitle>
          <CardDescription>
            Track call status and view results
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Filter by status:</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All Status</option>
              <option value="queued">Queued</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Call ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Call Success</TableHead>
                <TableHead>Patient Response</TableHead>
                <TableHead>Reason/Notes</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.filter(c => !statusFilter || c.call.status === statusFilter).map(c => {
                let success: string | null = null
                let patientResponse: string | null = null
                let reason: string | null = null
                try {
                  const sj = c.result?.structured_json ? JSON.parse(c.result.structured_json) : null
                  const so = sj?.structuredOutputs
                  if (so && typeof so === 'object') {
                    const firstKey = Object.keys(so)[0]
                    const result = firstKey ? so[firstKey]?.result : null
                    if (result) {
                      success = String(result.call_success ?? '')
                      patientResponse = result.patient_response ?? null
                      reason = result.reason ?? null
                    }
                  }
                  if (!success && sj?.analysisStructuredData) {
                    const r = sj.analysisStructuredData
                    success = String(r.call_success ?? '')
                    patientResponse = r.patient_response ?? null
                    reason = r.reason ?? null
                  }
                } catch {}

                const duration = c.call.started_at && c.call.ended_at 
                  ? Math.round((new Date(c.call.ended_at).getTime() - new Date(c.call.started_at).getTime()) / 1000)
                  : null

                return (
                  <TableRow key={c.call.id}>
                    <TableCell>
                      <Button variant="link" className="p-0 h-auto font-mono" asChild>
                        <a href={`/calls/${c.call.id}`}>#{c.call.id}</a>
                      </Button>
                    </TableCell>
                    <TableCell>{getStatusBadge(c.call.status)}</TableCell>
                    <TableCell className="font-medium">{c.patient?.name || '-'}</TableCell>
                    <TableCell>
                      {success === 'true' && <Badge variant="success">Success</Badge>}
                      {success === 'false' && <Badge variant="destructive">Failed</Badge>}
                      {!success && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{patientResponse || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{reason || c.call.fail_reason || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.call.started_at ? formatDateTime(c.call.started_at.split('T')[0], c.call.started_at.split('T')[1]?.split('.')[0]) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {duration ? `${duration}s` : '-'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {message && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 dark:text-blue-200">{message}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


