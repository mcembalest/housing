'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { DraggableChartCard } from './DraggableChartCard';
import { FRED_CHARTS, FredChartMeta } from '@/data/fred-charts';
import { dashboardTheme } from '@/lib/dashboardTheme';

interface DraggableSectionProps {
  id: string;
  name: string;
  chartIds: string[];
  onChartClick?: (chartMeta: FredChartMeta) => void;
  startDate?: string;
}

export function DraggableSection({ id, name, chartIds, onChartClick, startDate }: DraggableSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const headerStyle: React.CSSProperties = {
    padding: '24px 24px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: dashboardTheme.colors.brand,
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: '11px',
    padding: '4px 8px',
    backgroundColor: dashboardTheme.colors.brandSoft,
    borderRadius: '4px',
    color: dashboardTheme.colors.textMuted,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    padding: '24px',
    minHeight: '100px',
    borderRadius: '8px',
    backgroundColor: isOver ? dashboardTheme.colors.accentSoft : 'transparent',
    border: isOver ? `2px dashed ${dashboardTheme.colors.accent}` : '2px dashed transparent',
    transition: 'all 0.2s ease',
  };

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <span style={nameStyle}>{name}</span>
      </div>
      <div ref={setNodeRef} style={gridStyle}>
        <SortableContext items={chartIds} strategy={rectSortingStrategy}>
          {chartIds.map(chartId => {
            const chartMeta = FRED_CHARTS[chartId];
            if (!chartMeta) return null;
            return (
              <DraggableChartCard
                key={chartId}
                id={chartId}
                chartMeta={chartMeta}
                onClick={() => onChartClick?.(chartMeta)}
                startDate={startDate}
              />
            );
          })}
        </SortableContext>
      </div>
    </section>
  );
}
