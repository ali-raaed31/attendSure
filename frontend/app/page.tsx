import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Phone, FilePlus2, ShieldAlert } from 'lucide-react'

export default function Page() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Quick Actions</CardTitle>
            <CardDescription>Manage contacts and start outreach quickly</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href="/contacts">Open Contacts</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/calls">Launch Calls</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FilePlus2 className="h-5 w-5" /> Get Started</CardTitle>
            <CardDescription>Upload CSV or add patients manually</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Use Contacts to upload your patient list, then launch confirmation calls to reduce no-shows.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Status</CardTitle>
            <CardDescription>System health and recent activity</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Queued Calls</div>
              <div className="text-2xl font-semibold">0</div>
            </div>
            <div>
              <div className="text-muted-foreground">Completed Today</div>
              <div className="text-2xl font-semibold">0</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" /> Recent Calls</CardTitle>
          <CardDescription>Latest call batches will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No data yet. Start by uploading contacts and launching a call.</div>
        </CardContent>
      </Card>
    </div>
  )
}


