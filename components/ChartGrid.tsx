'use client';

import { ChartConfig, RegionData } from '@/lib/types';
import { ChartCard } from './ChartCard';

interface ChartGridProps {
  charts: ChartConfig[];
  data: RegionData[];
  onChartClick: (chart: ChartConfig) => void;
}

export function ChartGrid({ charts, data, onChartClick }: ChartGridProps) {
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    padding: '24px',
  };

  return (
    <div style={gridStyle}>
      {charts.map(chart => (
        <ChartCard
          key={chart.id}
          chart={chart}
          data={data}
          onClick={() => onChartClick(chart)}
          compact={true}
        />
      ))}
    </div>
  );
}
