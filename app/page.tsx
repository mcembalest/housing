export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
        Housing Dashboard
      </h1>
      <p style={{ color: '#9ca3af' }}>
        High-income housing turnover data visualization
      </p>

      {/* Placeholder for your dashboard components */}
      <div style={{
        marginTop: '2rem',
        padding: '2rem',
        backgroundColor: '#1f2937',
        borderRadius: '0.5rem'
      }}>
        <p>Dashboard components will go here.</p>
        <p style={{ color: '#6b7280', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          Your existing dashboard.js and housing_data.js can be migrated to React components.
        </p>
      </div>
    </main>
  )
}
