'use client';

interface SparklineProps {
  data: { [key: string]: number | string }[];
  dataKey: string;
  width?: number;
  height?: number;
  color?: string;
  showTrend?: boolean;
}

export function Sparkline({
  data,
  dataKey,
  width = 120,
  height = 32,
  color = '#10b981',
  showTrend = true,
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const values = data.map(d => d[dataKey] as number).filter(v => v != null);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    })
    .join(' ');

  const trend = values[values.length - 1] > values[0];
  const trendColor = showTrend ? (trend ? '#10b981' : '#ef4444') : color;

  const lastY = height - ((values[values.length - 1] - min) / range) * height * 0.8 - height * 0.1;

  return (
    <svg width={width} height={height} style={{ display: 'inline-block' }}>
      <polyline
        points={points}
        fill="none"
        stroke={trendColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={width} cy={lastY} r={3} fill={trendColor} />
    </svg>
  );
}
