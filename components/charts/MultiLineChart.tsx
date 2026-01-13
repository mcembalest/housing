'use client';

interface MultiLineChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey: string;
  groupBy: string;
  width?: number;
  height?: number;
  showLabels?: boolean;
}

const COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function MultiLineChart({
  data,
  dataKey,
  xKey,
  groupBy,
  width = 400,
  height = 200,
  showLabels = true,
}: MultiLineChartProps) {
  if (!data || data.length < 2) return null;

  const padding = { top: 20, right: 100, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Group data by the groupBy key
  const groups = [...new Set(data.map(d => String(d[groupBy])))];
  const xValues = [...new Set(data.map(d => String(d[xKey])))].sort();

  // Get all values for scaling
  const allValues = data.map(d => Number(d[dataKey]));
  const min = Math.min(...allValues) * 0.95;
  const max = Math.max(...allValues) * 1.05;
  const range = max - min || 1;

  // Build lines for each group
  const lines = groups.map((group, groupIndex) => {
    const groupData = data.filter(d => String(d[groupBy]) === group);
    const points = xValues.map((xVal, i) => {
      const point = groupData.find(d => String(d[xKey]) === xVal);
      if (!point) return null;
      const x = padding.left + (i / (xValues.length - 1)) * chartWidth;
      const y = padding.top + chartHeight - ((Number(point[dataKey]) - min) / range) * chartHeight;
      return { x, y };
    }).filter(Boolean) as { x: number; y: number }[];

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const color = COLORS[groupIndex % COLORS.length];
    const lastPoint = points[points.length - 1];

    return { group, pathD, color, lastPoint };
  });

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Grid */}
      {[0, 1, 2, 3, 4].map(i => {
        const y = padding.top + (i / 4) * chartHeight;
        return (
          <line
            key={i}
            x1={padding.left}
            y1={y}
            x2={padding.left + chartWidth}
            y2={y}
            stroke="#374151"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        );
      })}

      {/* Lines */}
      {lines.map(({ group, pathD, color }) => (
        <path
          key={group}
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Legend */}
      {showLabels && lines.map(({ group, color, lastPoint }, i) => (
        <g key={group}>
          {lastPoint && (
            <>
              <circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
              <text
                x={lastPoint.x + 8}
                y={lastPoint.y + 4}
                fill={color}
                fontSize={9}
              >
                {group.length > 8 ? group.slice(0, 8) + '...' : group}
              </text>
            </>
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {showLabels && xValues.filter((_, i) => i % Math.ceil(xValues.length / 4) === 0).map((label, i, arr) => {
        const x = padding.left + (xValues.indexOf(label) / (xValues.length - 1)) * chartWidth;
        return (
          <text
            key={label}
            x={x}
            y={height - padding.bottom + 20}
            fill="#9ca3af"
            fontSize={10}
            textAnchor="middle"
          >
            {label.slice(-2)}
          </text>
        );
      })}
    </svg>
  );
}
