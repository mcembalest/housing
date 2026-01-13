'use client';

import { useState } from 'react';
import { ChartGrid, ChartModal } from '@/components';
import { getAllDataSources } from '@/lib/data-sources';
import { ChartConfig } from '@/lib/types';

export default function Home() {
  const [selectedChart, setSelectedChart] = useState<ChartConfig | null>(null);
  const dataSources = getAllDataSources();

  const headerStyle: React.CSSProperties = {
    padding: '32px 24px 0',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#f3f4f6',
    margin: 0,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#9ca3af',
    marginTop: '8px',
  };

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '24px 24px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const sourceNameStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e5e7eb',
  };

  const sourceBadgeStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: '#374151',
    borderRadius: '4px',
    color: '#9ca3af',
  };

  return (
    <main>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Housing Turnover</h1>
        <p style={subtitleStyle}>
          Track high-income housing market acceleration across major US metros
        </p>
      </header>

      {dataSources.map(source => (
        <section key={source.config.id} style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sourceNameStyle}>{source.config.name}</span>
            <span style={sourceBadgeStyle}>
              {source.config.charts.length} charts
            </span>
          </div>
          <ChartGrid
            charts={source.config.charts}
            data={source.data}
            onChartClick={setSelectedChart}
          />
        </section>
      ))}

      <ChartModal
        chart={selectedChart}
        data={dataSources[0]?.data || []}
        onClose={() => setSelectedChart(null)}
      />
    </main>
  );
}
