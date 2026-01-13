import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Housing Dashboard',
  description: 'High-income housing turnover data visualization',
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
