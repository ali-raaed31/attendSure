'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, User, Calendar, Clock, CheckCircle, XCircle, AlertCircle, Loader2, FileText } from 'lucide-react'
import { apiGet } from '../../../lib/api'

type CallDetail = {
  call: { id: number; status: string; started_at?: string | null; ended_at?: string | null; fail_reason?: string | null }
  patient: { id: number; name: string; phone: string; doctor_name?: string; appointment_date?: string; appointment_time?: string }
  result?: { summary?: string | null; structured_json?: string | null }
}

export default function CallDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = React.useState<CallDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const loadCallDetail = async () => {
      try {
        const result = await apiGet<CallDetail>(`/api/calls/${params.id}`)
        setData(result)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadCallDetail()
  }, [params.id])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle className="w-4 h-4" />Completed</Badge>
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-4 h-4" />Failed</Badge>
      case 'in_progress':
        return <Badge variant="info" className="flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" />In Progress</Badge>
      case 'queued':
        return <Badge variant="warning" className="flex items-center gap-1"><Clock className="w-4 h-4" />Queued</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDateTime = (dateTimeStr?: string | null) => {
    if (!dateTimeStr) return '-'
    try {
      const date = new Date(dateTimeStr)
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    } catch {
      return dateTimeStr
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-4 h-4" />
            <span>Error loading call details: {error || 'Call not found'}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const structured = data.result?.structured_json ? (() => {
    try {
      return JSON.parse(data.result.structured_json)
    } catch {
      return null
    }
  })() : null
  
  const so = structured?.structuredOutputs
  const analysisSD = structured?.analysisStructuredData
  
  // Extract key info from structured data
  let callSuccess: string | null = null
  let patientResponse: string | null = null
  let reason: string | null = null
  let questions: string[] = []
  
  try {
    if (so && typeof so === 'object') {
      const firstKey = Object.keys(so)[0]
      const result = firstKey ? so[firstKey]?.result : null
      if (result) {
        callSuccess = String(result.call_success ?? '')
        patientResponse = result.patient_response ?? null
        reason = result.reason ?? null
        if (Array.isArray(result.questions)) questions = result.questions
      }
    }
    if (!callSuccess && analysisSD) {
      callSuccess = String(analysisSD.call_success ?? '')
      patientResponse = analysisSD.patient_response ?? null
      reason = analysisSD.reason ?? null
      if (Array.isArray(analysisSD.questions)) questions = analysisSD.questions
    }
  } catch {}

  const duration = data.call.started_at && data.call.ended_at 
    ? Math.round((new Date(data.call.ended_at).getTime() - new Date(data.call.started_at).getTime()) / 1000)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <a href="/calls">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Calls
          </a>
        </Button>
        <h1 className="text-2xl font-bold">Call #{data.call.id}</h1>
        {getStatusBadge(data.call.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              Call Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Started:</span>
                <div className="font-medium">{formatDateTime(data.call.started_at)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Ended:</span>
                <div className="font-medium">{formatDateTime(data.call.ended_at)}</div>
              </div>
              {duration && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Duration:</span>
                  <div className="font-medium">{Math.floor(duration / 60)}m {duration % 60}s</div>
                </div>
              )}
            </div>
            {data.call.fail_reason && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-4 h-4" />
                  <span className="font-medium">Failure Reason</span>
                </div>
                <p className="mt-1 text-sm">{data.call.fail_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-muted-foreground text-sm">Name:</span>
              <div className="font-medium">{data.patient.name}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Phone:</span>
              <div className="font-medium">{data.patient.phone}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Doctor:</span>
              <div className="font-medium">{data.patient.doctor_name || '-'}</div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Appointment:</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {data.patient.appointment_date ? 
                    `${data.patient.appointment_date} ${data.patient.appointment_time || ''}`.trim() : 
                    '-'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(callSuccess || patientResponse || reason || questions.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Call Results
            </CardTitle>
            <CardDescription>Structured data from VAPI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">Call Success:</span>
                <div className="mt-1">
                  {callSuccess === 'true' && <Badge variant="success">Successful</Badge>}
                  {callSuccess === 'false' && <Badge variant="destructive">Failed</Badge>}
                  {!callSuccess && <span className="text-muted-foreground">Not determined</span>}
                </div>
              </div>
              {reason && (
                <div>
                  <span className="text-muted-foreground text-sm">Reason:</span>
                  <div className="mt-1 font-medium">{reason}</div>
                </div>
              )}
            </div>
            
            {patientResponse && (
              <div>
                <span className="text-muted-foreground text-sm">Patient Response:</span>
                <div className="mt-1 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm">{patientResponse}</p>
                </div>
              </div>
            )}

            {questions.length > 0 && (
              <div>
                <span className="text-muted-foreground text-sm">Questions Asked:</span>
                <ul className="mt-1 space-y-1">
                  {questions.map((q, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {data.result?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Call Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{data.result.summary}</p>
          </CardContent>
        </Card>
      )}

      {structured && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Raw VAPI Data
            </CardTitle>
            <CardDescription>
              Complete structured data from VAPI (for debugging)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-96">
              {JSON.stringify(structured, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


