'use client';

import { dashboardTheme } from '@/lib/dashboardTheme';

interface BarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  labelKey: string;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

export function BarChart({
  data,
  dataKey,
  labelKey,
  width = 400,
  height = 200,
  showLabels = true,
}: BarChartProps) {
  if (!data || data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = data.map(d => Number(d[dataKey]));
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;

  const barWidth = chartWidth / data.length * 0.7;
  const barGap = chartWidth / data.length * 0.3;

  const zeroY = padding.top + chartHeight - ((0 - minVal) / range) * chartHeight;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Zero line */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={width - padding.right}
        y2={zeroY}
        stroke={dashboardTheme.chart.axis}
        strokeWidth={1}
      />

      {/* Bars */}
      {data.map((d, i) => {
        const value = Number(d[dataKey]);
        const x = padding.left + i * (barWidth + barGap) + barGap / 2;
        const barHeight = Math.abs((value / range) * chartHeight);
        const y = value >= 0 ? zeroY - barHeight : zeroY;
        const color = value >= 0 ? dashboardTheme.chart.primary : dashboardTheme.chart.negative;

        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx={2}
            />
            {showLabels && (
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 15}
                fill={dashboardTheme.chart.label}
                fontSize={9}
                textAnchor="middle"
                transform={`rotate(-45, ${x + barWidth / 2}, ${height - padding.bottom + 15})`}
              >
                {String(d[labelKey]).slice(0, 10)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
