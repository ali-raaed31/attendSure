import './globals.css'
import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ToastProvider } from './toast'

export const metadata = {
  title: 'AttendSure',
  description: 'Automated appointment confirmation calls',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Image src="/attendsure-icon.svg" alt="AttendSure" width={26} height={26} />
                <span style={{ fontWeight: 700 }}>AttendSure</span>
              </Link>
            </div>
            <nav style={{ display: 'flex', gap: 16 }}>
              <Link href="/">Dashboard</Link>
              <Link href="/contacts">Contacts</Link>
              <Link href="/calls">Calls</Link>
            </nav>
          </div>
        </header>
        <ToastProvider>
          <main style={{ padding: 16, maxWidth: 1000, margin: '0 auto' }}>{children}</main>
        </ToastProvider>
      </body>
    </html>
  )
}


