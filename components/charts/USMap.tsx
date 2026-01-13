'use client';

import { RegionData } from '@/lib/types';

interface USMapProps {
  data: RegionData[];
  width?: number;
  height?: number;
}

// Simple US outline path (approximate)
const US_PATH = `M 50 80
  L 60 70 L 100 65 L 140 60 L 180 55 L 220 50 L 260 48 L 300 50 L 340 55 L 360 70
  L 370 90 L 375 110 L 378 130 L 375 150 L 360 170
  L 340 180 L 300 185 L 260 190 L 220 192 L 180 190 L 140 185 L 100 178 L 70 165
  L 55 145 L 48 120 L 45 100 Z`;

// Convert lat/lng to simple x/y for US bounds
function projectToUS(lat: number, lng: number, width: number, height: number): { x: number; y: number } {
  // US bounds roughly: lat 25-50, lng -125 to -65
  const minLat = 24;
  const maxLat = 50;
  const minLng = -125;
  const maxLng = -65;

  const x = ((lng - minLng) / (maxLng - minLng)) * width * 0.85 + width * 0.05;
  const y = ((maxLat - lat) / (maxLat - minLat)) * height * 0.75 + height * 0.1;

  return { x, y };
}

export function USMap({ data, width = 400, height = 250 }: USMapProps) {
  // Get score range for sizing
  const scores = data.map(d => d.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const scoreRange = maxScore - minScore || 1;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* US Outline */}
      <path
        d={US_PATH}
        fill="none"
        stroke="#4b5563"
        strokeWidth={2}
        transform={`scale(${width / 420}, ${height / 220})`}
      />

      {/* Hotspots */}
      {data.map(region => {
        if (!region.coordinates) return null;

        const { x, y } = projectToUS(region.coordinates.lat, region.coordinates.lng, width, height);
        const normalizedScore = (region.score - minScore) / scoreRange;
        const radius = 8 + normalizedScore * 15;
        const color = region.score > 10 ? '#10b981' : region.score > 0 ? '#f59e0b' : '#ef4444';
        const opacity = 0.5 + normalizedScore * 0.5;

        return (
          <g key={region.region}>
            {/* Glow */}
            <circle
              cx={x}
              cy={y}
              r={radius + 4}
              fill={color}
              opacity={0.2}
            />
            {/* Main dot */}
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={color}
              opacity={opacity}
              stroke={color}
              strokeWidth={2}
            />
            {/* Label */}
            <text
              x={x}
              y={y + radius + 12}
              fill="#e5e7eb"
              fontSize={9}
              textAnchor="middle"
              fontWeight="bold"
            >
              {region.region}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
