'use client'
import React from 'react'
import Papa from 'papaparse'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Phone, FileUp, Plus } from 'lucide-react'
import { useToast } from '../toast'
import { apiGet, apiPost, apiPostForm, API_BASE } from '@/lib/api'

type Patient = {
  id: number
  name: string
  gender?: string
  phone: string
  dob?: string
  appointment_date?: string
  appointment_time?: string
  doctor_name?: string
}

type CallDetail = {
  call: { id: number; status: string; fail_reason?: string }
  patient: Patient
  result?: { summary?: string; structured_json?: string | null }
}

export default function ContactsPage() {
  const { push } = useToast()

  const [patients, setPatients] = React.useState<Patient[]>([])
  const [loading, setLoading] = React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)

  const [addOpen, setAddOpen] = React.useState(false)
  const [addForm, setAddForm] = React.useState({
    name: '',
    phone: '',
    gender: 'other',
    dob: '',
    appointment_date: '',
    appointment_time: '',
    doctor_name: '',
  })

  const [callOpen, setCallOpen] = React.useState(false)
  const [activePatient, setActivePatient] = React.useState<Patient | null>(null)
  const [callId, setCallId] = React.useState<number | null>(null)
  const [callDetail, setCallDetail] = React.useState<CallDetail | null>(null)

  const [summaryOpen, setSummaryOpen] = React.useState(false)
  const [summaryDetail, setSummaryDetail] = React.useState<CallDetail | null>(null)

  const loadPatients = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<Patient[]>('/api/contacts')
      console.log('Loaded patients from contacts:', data)
      setPatients(data)
    } catch {
      try {
        const data = await apiGet<Patient[]>('/api/patients')
        console.log('Loaded patients from patients:', data)
      setPatients(data)
    } catch (e: any) {
        setPatients([])
        push({ message: e?.message || 'Failed to load patients', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [push])

  React.useEffect(() => { void loadPatients() }, [loadPatients])

  async function handleImport() {
    if (!file) return
    try {
      // Try JSON upload first (fast path)
      const rows: any[] = await new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
          complete: (res) => resolve(res.data as any[]),
          error: (err) => reject(err),
        })
      })
      try {
        await apiPost('/api/contacts/upload-json', rows)
      } catch {
        const fd = new FormData()
        fd.append('file', file)
        // Prefer contacts/upload, fallback to patients/upload
        try { await apiPostForm('/api/contacts/upload', fd) } catch { await apiPostForm('/api/patients/upload', fd) }
      }
      setUploadOpen(false)
      setFile(null)
      push({ message: 'Import completed', type: 'success' })
      void loadPatients()
    } catch (e: any) {
      push({ message: e?.message || 'Failed to import', type: 'error' })
    }
  }

  function openCall(patient: Patient) {
    console.log('Opening call modal for patient:', patient)
    setActivePatient(patient)
    setCallDetail(null)
    setCallId(null)
    setCallOpen(true)
  }

  async function launchCall() {
    if (!activePatient) return
    try {
      const variableValues = {
        // legacy keys for backward compatibility
        name: activePatient.name,
        gender: activePatient.gender,
        appointment_date: activePatient.appointment_date,
        appointment_time: activePatient.appointment_time,
        doctor_name: activePatient.doctor_name,
        // requested keys
        app_date: activePatient.appointment_date,
        app_time: activePatient.appointment_time,
        full_name: activePatient.name,
        dob: activePatient.dob,
        doctor: activePatient.doctor_name,
      }
      console.log('Launching call for patient:', activePatient)
      
      // Ensure we have a valid patient ID
      if (!activePatient.id) {
        throw new Error('Patient ID is missing')
      }
      
      const payload = {
        patientIds: [activePatient.id],
        patient_ids: [activePatient.id], // Add fallback key
      }
      console.log('Call launch payload:', payload)
      console.log('API endpoint:', `${API_BASE}/api/calls/launch`)
      
      const res = await apiPost<{ callIds: number[] }>(
        '/api/calls/launch',
        payload
      )
      console.log('Launch response:', res)
      const id = res.callIds?.[0]
      if (!id) {
        throw new Error('Launch responded without call id')
      }
      setCallId(id)
      push({ message: `Call #${id} launched`, type: 'success' })
      pollStatus(id)
    } catch (e: any) {
      push({ message: e?.message || 'Failed to launch call', type: 'error' })
    }
  }

  function pollStatus(id: number) {
    let cancelled = false
    const tick = async () => {
      try {
        const detail = await apiGet<CallDetail>(`/api/calls/${id}`)
        if (cancelled) return
        setCallDetail(detail)
        const status = detail?.call?.status
        if (status === 'completed' || status === 'failed') return
        setTimeout(tick, 3000)
        } catch {
        if (!cancelled) setTimeout(tick, 3000)
      }
    }
    setTimeout(tick, 1000)
    return () => { cancelled = true }
  }

  function openSummary(detail: CallDetail) {
    setSummaryDetail(detail)
    setSummaryOpen(true)
  }

  async function handleAddPatient() {
    try {
      const payload = {
        ...addForm,
        gender: addForm.gender || 'other',
        dob: addForm.dob || null,
        appointment_date: addForm.appointment_date || null,
        appointment_time: addForm.appointment_time || null,
        doctor_name: addForm.doctor_name || null,
      }
      console.log('Add patient payload:', payload)
      
      let res: { id: number }
      try {
        res = await apiPost<{ id: number }>('/api/contacts', payload)
      } catch (contactsError) {
        console.log('Contacts endpoint failed, trying patients:', contactsError)
        // Fallback to /api/patients endpoint
        res = await apiPost<{ id: number }>('/api/patients', payload)
      }
      
      push({ message: `Patient #${res.id} created`, type: 'success' })
      setAddOpen(false)
      setAddForm({
        name: '',
        phone: '',
        gender: 'other',
        dob: '',
        appointment_date: '',
        appointment_time: '',
        doctor_name: '',
      })
      void loadPatients()
    } catch (e: any) {
      console.error('Add patient error:', e)
      push({ message: e?.message || 'Failed to add patient', type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <div className="flex gap-2">
          <Button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Patient
          </Button>
          <Button onClick={() => setUploadOpen(true)} className="inline-flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Import CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patients {loading ? <span className="text-sm font-normal text-muted-foreground">(loading...)</span> : null}</CardTitle>
          <CardDescription>Manage patients and launch confirmation calls</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{p.doctor_name || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.appointment_date || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{p.appointment_time || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => openCall(p)} className="inline-flex items-center gap-1">
                        <Phone className="h-4 w-4" /> Call
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            {patients.length === 0 ? (
              <TableCaption>No patients found. Import a CSV to get started.</TableCaption>
            ) : null}
          </Table>
        </CardContent>
      </Card>

      {uploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-2 text-lg font-semibold">Import Patients CSV</h3>
            <p className="mb-4 text-sm text-muted-foreground">Choose a CSV with headers: name, gender, phone, dob, appointment_date, appointment_time, doctor_name</p>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mb-4 w-full rounded-md border bg-background px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setUploadOpen(false); setFile(null) }}>Cancel</Button>
              <Button onClick={handleImport} disabled={!file} className="inline-flex items-center gap-2"><FileUp className="h-4 w-4" /> Import</Button>
            </div>
          </div>
        </div>
      ) : null}

      {callOpen && activePatient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Call Patient</h3>
              <Button variant="ghost" onClick={() => { setCallOpen(false); setActivePatient(null); setCallDetail(null); setCallId(null) }}>Close</Button>
          </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
                <div className="text-muted-foreground">Name</div>
                <div className="font-medium">{activePatient.name}</div>
          </div>
          <div>
                <div className="text-muted-foreground">Phone</div>
                <div className="font-medium">{activePatient.phone}</div>
          </div>
          <div>
                <div className="text-muted-foreground">DOB</div>
                <div className="font-medium">{activePatient.dob || 'Not provided'}</div>
          </div>
          <div>
                <div className="text-muted-foreground">Doctor</div>
                <div className="font-medium">{activePatient.doctor_name || '-'}</div>
          </div>
          <div>
                <div className="text-muted-foreground">Appointment</div>
                <div className="font-medium">{activePatient.appointment_date || '-'} {activePatient.appointment_time || ''}</div>
          </div>
          </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm">
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">
                  {callDetail?.call?.status || (callId ? 'in_progress' : 'idle')}
                </div>
                {callDetail?.call?.fail_reason ? (
                  <div className="text-sm text-red-600">{callDetail.call.fail_reason}</div>
                ) : null}
                </div>
              <div className="flex gap-3">
                <Button onClick={launchCall} disabled={!!callId} className="inline-flex items-center gap-2"><Phone className="h-4 w-4" /> {callId ? 'Calling...' : 'Start Call'}</Button>
                {callDetail ? (
                  <Button variant="secondary" onClick={() => openSummary(callDetail)}>Summary</Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {summaryOpen && summaryDetail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-background p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Call Summary</h3>
              <Button variant="ghost" onClick={() => { setSummaryOpen(false); setSummaryDetail(null) }}>Close</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-muted-foreground">Patient</div>
                <div className="font-medium">{summaryDetail.patient?.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">{summaryDetail.call?.status}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">Summary</div>
              <div className="text-sm">{summaryDetail.result?.summary || '-'}</div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">Structured</div>
              <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{
                summaryDetail.result?.structured_json ? JSON.stringify(
                  (() => { try { return JSON.parse(summaryDetail.result!.structured_json as string) } catch { return summaryDetail.result!.structured_json } })(),
                  null,
                  2
                ) : '-'
              }</pre>
              </div>
            </div>
          </div>
        ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">Add Patient</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">Name *</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phone *</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+1234567890"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Gender</label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.gender}
                  onChange={(e) => setAddForm({ ...addForm, gender: e.target.value })}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date of Birth</label>
                <input
                  type="date"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.dob}
                  onChange={(e) => setAddForm({ ...addForm, dob: e.target.value })}
                />
            </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Doctor</label>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.doctor_name}
                  onChange={(e) => setAddForm({ ...addForm, doctor_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Appointment Date</label>
                <input
                  type="date"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.appointment_date}
                  onChange={(e) => setAddForm({ ...addForm, appointment_date: e.target.value })}
                />
            </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Appointment Time</label>
                <input
                  type="time"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={addForm.appointment_time}
                  onChange={(e) => setAddForm({ ...addForm, appointment_time: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setAddOpen(false) }}>Cancel</Button>
              <Button onClick={handleAddPatient} disabled={!addForm.name || !addForm.phone}>
                Add Patient
              </Button>
            </div>
            </div>
          </div>
        ) : null}
    </div>
  )
}


