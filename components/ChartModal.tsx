'use client';

import { ChartConfig, RegionData } from '@/lib/types';
import { ChartCard } from './ChartCard';

interface ChartModalProps {
  chart: ChartConfig | null;
  data: RegionData[];
  onClose: () => void;
}

export function ChartModal({ chart, data, onClose }: ChartModalProps) {
  if (!chart) return null;

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '40px',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#1f2937',
    borderRadius: '16px',
    border: '1px solid #374151',
    maxWidth: '900px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '8px',
    lineHeight: 1,
    zIndex: 10,
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <button
          style={closeButtonStyle}
          onClick={onClose}
          onMouseEnter={e => (e.currentTarget.style.color = '#f3f4f6')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          ×
        </button>
        <ChartCard
          chart={chart}
          data={data}
          onClick={() => {}}
          compact={false}
        />
      </div>
    </div>
  );
}
