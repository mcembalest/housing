import type { Metadata } from 'next'

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
        backgroundColor: '#111827',
        color: 'white',
        margin: 0
      }}>
        {children}
      </body>
    </html>
  )
}
