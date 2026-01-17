import type { Metadata } from 'next'
import { dashboardTheme } from '@/lib/dashboardTheme'

export const metadata: Metadata = {
  title: 'Housing Turnover',
  description: 'High-income housing turnover data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        backgroundColor: dashboardTheme.colors.background,
        color: dashboardTheme.colors.text,
        margin: 0
      }}>
        {children}
      </body>
    </html>
  )
}
