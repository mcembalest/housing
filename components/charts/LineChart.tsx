'use client';

import { dashboardTheme } from '@/lib/dashboardTheme';

interface LineChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
}

export function LineChart({
  data,
  dataKey,
  xKey,
  width = 400,
  height = 200,
  color = dashboardTheme.chart.primary,
  showGrid = true,
  showLabels = true,
}: LineChartProps) {
  if (!data || data.length < 2) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => Number(d[dataKey]));
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.05;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((Number(d[dataKey]) - min) / range) * chartHeight;
    return { x, y, label: String(d[xKey]) };
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

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid */}
      {showGrid && gridLines.map((line, i) => (
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
          {showLabels && (
            <text
              x={padding.left - 8}
              y={line.y + 4}
              fill={dashboardTheme.chart.label}
              fontSize={10}
              textAnchor="end"
            >
              {line.value.toFixed(1)}
            </text>
          )}
        </g>
      ))}

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* X-axis labels */}
      {showLabels && points.filter((_, i) => i % Math.ceil(points.length / 6) === 0 || i === points.length - 1).map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - padding.bottom + 20}
          fill={dashboardTheme.chart.label}
          fontSize={10}
          textAnchor="middle"
        >
          {p.label.slice(-2)}
        </text>
      ))}
    </svg>
  );
}
