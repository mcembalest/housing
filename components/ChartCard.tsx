'use client';

import { ChartConfig, RegionData } from '@/lib/types';
import { Sparkline, LineChart, BarChart, MultiLineChart, USMap } from './charts';
import { housingData } from '@/data/housing-turnover/data';

interface ChartCardProps {
  chart: ChartConfig;
  data: RegionData[];
  onClick: () => void;
  compact?: boolean;
}

export function ChartCard({ chart, data, onClick, compact = true }: ChartCardProps) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '12px',
    border: '1px solid #374151',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: compact ? '12px 16px' : '16px 20px',
    borderBottom: '1px solid #374151',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: compact ? '14px' : '18px',
    fontWeight: 600,
    color: '#f3f4f6',
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0 0 0',
  };

  const chartContainerStyle: React.CSSProperties = {
    padding: compact ? '16px' : '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: compact ? '140px' : '300px',
  };

  const renderChart = () => {
    const width = compact ? 280 : 500;
    const height = compact ? 120 : 280;

    switch (chart.type) {
      case 'line': {
        // For line charts, pick the top region's timeseries
        const topRegion = data[0];
        if (!topRegion?.timeseries) return null;
        const lineData = topRegion.timeseries.map(t => ({ ...t } as Record<string, unknown>));
        return (
          <LineChart
            data={lineData}
            dataKey={chart.dataKey}
            xKey={chart.xKey || 'period'}
            width={width}
            height={height}
            showLabels={!compact}
          />
        );
      }

      case 'multiline': {
        // Flatten timeseries with region labels
        const flatData = data.flatMap(region =>
          region.timeseries.map(t => ({
            ...t,
            region: region.region,
          } as Record<string, unknown>))
        );
        return (
          <MultiLineChart
            data={flatData}
            dataKey={chart.dataKey}
            xKey={chart.xKey || 'period'}
            groupBy={chart.groupBy || 'region'}
            width={width}
            height={height}
            showLabels={!compact}
          />
        );
      }

      case 'bar': {
        // Create bar data from regions
        const barData = data.map(region => ({
          region: region.region,
          accelerationScore: region.score,
        } as Record<string, unknown>));
        return (
          <BarChart
            data={barData}
            dataKey={chart.dataKey}
            labelKey="region"
            width={width}
            height={height}
            showLabels={!compact}
          />
        );
      }

      case 'map': {
        return <USMap data={data} width={width} height={height} />;
      }

      default:
        return <div style={{ color: '#6b7280' }}>Unknown chart type</div>;
    }
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#6b7280';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#374151';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={headerStyle}>
        <h3 style={titleStyle}>{chart.title}</h3>
        {!compact && <p style={descStyle}>{chart.description}</p>}
      </div>
      <div style={chartContainerStyle}>{renderChart()}</div>
    </div>
  );
}
