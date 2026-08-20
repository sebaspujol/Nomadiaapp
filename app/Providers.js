'use client'
import { SessionProvider } from 'next-auth/react'
import { LangProvider } from '../src/lib/i18n'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <LangProvider>{children}</LangProvider>
    </SessionProvider>
  )
}
