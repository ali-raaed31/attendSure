import './globals.css'
import React from 'react'
import { ToastProvider } from './toast'
import { Sidebar } from '@/components/sidebar'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = {
  title: 'AttendSure',
  description: 'Automated appointment confirmation calls',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <Sidebar />
            <div className="ml-64 min-h-screen">
              <header className="sticky top-0 z-30 flex h-16 items-center justify-end border-b bg-background/60 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/50">
                <ThemeToggle />
              </header>
              <main className="p-6">
                {children}
              </main>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


