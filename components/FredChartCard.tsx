'use client';

import { useEffect, useState } from 'react';
import { FredChartMeta } from '@/data/fred-charts';
import { dashboardTheme } from '@/lib/dashboardTheme';

interface FredDataPoint {
  date: string;
  value: number;
}

interface FredChartCardProps {
  chartMeta: FredChartMeta;
  onClick?: () => void;
  compact?: boolean;
  startDate?: string;
}

export function FredChartCard({ chartMeta, onClick, compact = true, startDate }: FredChartCardProps) {
  const [rawData, setRawData] = useState<FredDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/data?series=${chartMeta.id}`)
      .then(res => res.json())
      .then(result => {
        setRawData(result.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chartMeta.id]);

  // Filter data by startDate
  const data = startDate
    ? rawData.filter(d => d.date >= startDate)
    : rawData;

  const cardStyle: React.CSSProperties = {
    backgroundColor: dashboardTheme.colors.surface,
    borderRadius: '12px',
    border: `1px solid ${dashboardTheme.colors.border}`,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
    height: '100%',
  };

  const headerStyle: React.CSSProperties = {
    padding: compact ? '12px 16px' : '16px 20px',
    borderBottom: `1px solid ${dashboardTheme.colors.border}`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: compact ? '14px' : '18px',
    fontWeight: 600,
    color: dashboardTheme.colors.text,
    margin: 0,
  };

  const descStyle: React.CSSProperties = {
    fontSize: '12px',
    color: dashboardTheme.colors.textMuted,
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
    if (loading) {
      return <div style={{ color: dashboardTheme.colors.textSubtle }}>Loading...</div>;
    }

    if (!data || data.length < 2) {
      return <div style={{ color: dashboardTheme.colors.textSubtle }}>No data</div>;
    }

    const width = compact ? 280 : 500;
    const height = compact ? 120 : 280;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const min = Math.min(...values) * 0.95;
    const max = Math.max(...values) * 1.05;
    const range = max - min || 1;

    const points = data.map((d, i) => {
      const x = padding.left + (i / (data.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((d.value - min) / range) * chartHeight;
      return { x, y, date: d.date, value: d.value };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Grid lines
    const gridLines = [];
    const numGridLines = 4;
    for (let i = 0; i <= numGridLines; i++) {
      const y = padding.top + (i / numGridLines) * chartHeight;
      const value = max - (i / numGridLines) * range;
      gridLines.push({ y, value });
    }

    const color = dashboardTheme.chart.primary;

    // Format value for display
    const formatValue = (val: number) => {
      if (chartMeta.unit === '%') return val.toFixed(1);
      if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
      return val.toFixed(1);
    };

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Grid */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke={dashboardTheme.chart.grid}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
            {!compact && (
              <text
                x={padding.left - 8}
                y={line.y + 4}
                fill={dashboardTheme.chart.label}
                fontSize={10}
                textAnchor="end"
              >
                {formatValue(line.value)}
              </text>
            )}
          </g>
        ))}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`}
          fill={dashboardTheme.chart.areaFill}
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis labels */}
        {!compact && points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={height - padding.bottom + 20}
            fill={dashboardTheme.chart.label}
            fontSize={10}
            textAnchor="middle"
          >
            {p.date.slice(0, 7)}
          </text>
        ))}
      </svg>
    );
  };

  // Current value display
  const currentValue = data.length > 0 ? data[data.length - 1].value : null;
  const prevValue = data.length > 1 ? data[data.length - 2].value : null;
  const change = currentValue !== null && prevValue !== null ? currentValue - prevValue : null;

  const dateRange =
    data.length > 0
      ? `${data[0].date.slice(0, 7)} - ${data[data.length - 1].date.slice(0, 7)}`
      : null;

  const dateRangeStyle: React.CSSProperties = {
    padding: compact ? '0 16px 12px' : '0 24px 16px',
    fontSize: '11px',
    color: dashboardTheme.colors.textMuted,
    display: 'flex',
    justifyContent: 'space-between',
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={e => {
        if (onClick) {
          e.currentTarget.style.borderColor = dashboardTheme.colors.borderStrong;
          e.currentTarget.style.transform = 'translateY(-2px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = dashboardTheme.colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 style={titleStyle}>{chartMeta.title}</h3>
          {compact && currentValue !== null && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: dashboardTheme.colors.text }}>
                {currentValue.toFixed(chartMeta.unit === '%' ? 2 : 1)}
                <span style={{ fontSize: '11px', color: dashboardTheme.colors.textMuted, marginLeft: '2px' }}>{chartMeta.unit}</span>
              </span>
              {change !== null && (
                <div style={{ fontSize: '11px', color: change >= 0 ? dashboardTheme.chart.positive : dashboardTheme.chart.negative }}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}
                </div>
              )}
            </div>
          )}
        </div>
        {!compact && <p style={descStyle}>{chartMeta.description}</p>}
      </div>
      <div style={chartContainerStyle}>{renderChart()}</div>
      {dateRange && (
        <div style={dateRangeStyle}>
          <span>{data[0].date.slice(0, 7)}</span>
          <span>{data[data.length - 1].date.slice(0, 7)}</span>
        </div>
      )}
    </div>
  );
}
