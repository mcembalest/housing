'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { DraggableSection, FredChartCard } from '@/components';
import { FRED_CHARTS, FredChartMeta } from '@/data/fred-charts';
import { dashboardTheme } from '@/lib/dashboardTheme';

interface DashboardSection {
  id: string;
  name: string;
  chartIds: string[];
}

interface DashboardConfig {
  sections: DashboardSection[];
}

const DATE_RANGE_OPTIONS = [
  { label: '1Y', years: 1 },
  { label: '3Y', years: 3 },
  { label: '5Y', years: 5 },
  { label: '10Y', years: 10 },
  { label: 'All', years: 100 },
];

export default function Home() {
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedChart, setSelectedChart] = useState<FredChartMeta | null>(null);
  const [dateRange, setDateRange] = useState<number | null>(10); // years, null means custom
  const [customStartDate, setCustomStartDate] = useState<string>('2015-01-01');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const saveConfig = useCallback(async (newConfig: DashboardConfig) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, []);

  const findSectionByChartId = (chartId: string): DashboardSection | undefined => {
    return config?.sections.find(s => s.chartIds.includes(chartId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!config) return;

    const { active, over } = event;
    if (!over) return;

    const activeChartId = active.id as string;
    const overId = over.id as string;

    const activeSection = findSectionByChartId(activeChartId);
    let overSection = findSectionByChartId(overId);

    // If overId is a section id (not a chart), find that section
    if (!overSection) {
      overSection = config.sections.find(s => s.id === overId);
    }

    if (!activeSection || !overSection) return;

    // If moving to a different section
    if (activeSection.id !== overSection.id) {
      const newConfig = { ...config };
      const sourceSectionIndex = newConfig.sections.findIndex(s => s.id === activeSection.id);
      const destSectionIndex = newConfig.sections.findIndex(s => s.id === overSection!.id);

      // Remove from source
      newConfig.sections[sourceSectionIndex] = {
        ...newConfig.sections[sourceSectionIndex],
        chartIds: newConfig.sections[sourceSectionIndex].chartIds.filter(id => id !== activeChartId),
      };

      // Add to destination
      const overIndex = overSection.chartIds.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : overSection.chartIds.length;
      const newDestChartIds = [...newConfig.sections[destSectionIndex].chartIds];
      newDestChartIds.splice(insertIndex, 0, activeChartId);
      newConfig.sections[destSectionIndex] = {
        ...newConfig.sections[destSectionIndex],
        chartIds: newDestChartIds,
      };

      setConfig(newConfig);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !config) return;

    const activeChartId = active.id as string;
    const overId = over.id as string;

    const activeSection = findSectionByChartId(activeChartId);
    let overSection = findSectionByChartId(overId);

    // If overId is a section id (not a chart), find that section
    if (!overSection) {
      overSection = config.sections.find(s => s.id === overId);
    }

    if (!activeSection || !overSection) return;

    // Reorder within same section
    if (activeSection.id === overSection.id && activeChartId !== overId) {
      const sectionIndex = config.sections.findIndex(s => s.id === activeSection.id);
      const oldIndex = activeSection.chartIds.indexOf(activeChartId);
      const newIndex = activeSection.chartIds.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newConfig = { ...config };
        newConfig.sections[sectionIndex] = {
          ...newConfig.sections[sectionIndex],
          chartIds: arrayMove(activeSection.chartIds, oldIndex, newIndex),
        };
        setConfig(newConfig);
        saveConfig(newConfig);
      }
    } else if (activeSection.id !== overSection.id) {
      // Cross-section move: compute the final config here to avoid stale state
      // (handleDragOver updated React state, but it's async so config is stale)
      const newConfig = { ...config };
      const sourceSectionIndex = newConfig.sections.findIndex(s => s.id === activeSection.id);
      const destSectionIndex = newConfig.sections.findIndex(s => s.id === overSection!.id);

      // Remove from source
      newConfig.sections[sourceSectionIndex] = {
        ...newConfig.sections[sourceSectionIndex],
        chartIds: newConfig.sections[sourceSectionIndex].chartIds.filter(id => id !== activeChartId),
      };

      // Add to destination
      const overIndex = overSection.chartIds.indexOf(overId);
      const insertIndex = overIndex >= 0 ? overIndex : overSection.chartIds.length;
      const newDestChartIds = [...newConfig.sections[destSectionIndex].chartIds];
      newDestChartIds.splice(insertIndex, 0, activeChartId);
      newConfig.sections[destSectionIndex] = {
        ...newConfig.sections[destSectionIndex],
        chartIds: newDestChartIds,
      };

      setConfig(newConfig);
      saveConfig(newConfig);
    }
  };

  if (!config) {
    return (
      <main style={{ padding: '32px', color: dashboardTheme.colors.textMuted }}>
        Loading dashboard...
      </main>
    );
  }

  const activeChartMeta = activeId ? FRED_CHARTS[activeId] : null;

  // Calculate the start date based on selected range or custom date
  let startDateStr: string;
  if (dateRange !== null) {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - dateRange);
    startDateStr = startDate.toISOString().slice(0, 10);
  } else {
    startDateStr = customStartDate;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <main>
        {/* Date Range Selector */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '24px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: dashboardTheme.colors.brand, margin: 0 }}>
            High Income Housing Turnover Indicators
          </h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {DATE_RANGE_OPTIONS.map(opt => (
              <button
                key={opt.label}
                onClick={() => setDateRange(opt.years)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${dateRange === opt.years ? dashboardTheme.colors.brand : dashboardTheme.colors.border}`,
                  backgroundColor: dateRange === opt.years ? dashboardTheme.colors.brand : dashboardTheme.colors.surface,
                  color: dateRange === opt.years ? dashboardTheme.colors.textInverse : dashboardTheme.colors.textMuted,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {opt.label}
              </button>
            ))}
            <div
              onClick={() => setDateRange(null)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `1px solid ${dateRange === null ? dashboardTheme.colors.brand : dashboardTheme.colors.border}`,
                backgroundColor: dateRange === null ? dashboardTheme.colors.brand : dashboardTheme.colors.surface,
                color: dateRange === null ? dashboardTheme.colors.textInverse : dashboardTheme.colors.textMuted,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              From
              {dateRange === null && (
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setDateRange(null);
                  }}
                  style={{
                    padding: '2px 4px',
                    borderRadius: '4px',
                    border: `1px solid ${dashboardTheme.colors.border}`,
                    backgroundColor: dashboardTheme.colors.surface,
                    color: dashboardTheme.colors.text,
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    width: '120px',
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {config.sections.map(section => (
          <DraggableSection
            key={section.id}
            id={section.id}
            name={section.name}
            chartIds={section.chartIds}
            onChartClick={setSelectedChart}
            startDate={startDateStr}
          />
        ))}

        <DragOverlay>
          {activeChartMeta ? (
            <div style={{ width: '320px', opacity: 0.8 }}>
              <FredChartCard chartMeta={activeChartMeta} compact={true} startDate={startDateStr} />
            </div>
          ) : null}
        </DragOverlay>
      </main>

      {/* Modal for expanded chart view */}
      {selectedChart && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 25, 46, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedChart(null)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '800px',
              backgroundColor: dashboardTheme.colors.surface,
              borderRadius: '12px',
              overflow: 'hidden',
              border: `1px solid ${dashboardTheme.colors.border}`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <FredChartCard chartMeta={selectedChart} compact={false} startDate={startDateStr} />
            <div style={{ padding: '16px', borderTop: `1px solid ${dashboardTheme.colors.border}` }}>
              <button
                onClick={() => setSelectedChart(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: dashboardTheme.colors.brand,
                  color: dashboardTheme.colors.textInverse,
                  border: `1px solid ${dashboardTheme.colors.brandStrong}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
