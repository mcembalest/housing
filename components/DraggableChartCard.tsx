'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FredChartMeta } from '@/data/fred-charts';
import { FredChartCard } from './FredChartCard';

interface DraggableChartCardProps {
  chartMeta: FredChartMeta;
  id: string;
  onClick?: () => void;
  startDate?: string;
}

export function DraggableChartCard({ chartMeta, id, onClick, startDate }: DraggableChartCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FredChartCard chartMeta={chartMeta} onClick={onClick} compact={true} startDate={startDate} />
    </div>
  );
}
