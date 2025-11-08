import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SyncBoard Pro - Quadro Branco Colaborativo',
  description: 'Sistema de quadro branco colaborativo em tempo real para testes de QA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
