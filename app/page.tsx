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
import { SettingsPanel } from '@/components/SettingsPanel';
import { CustomDataSource, makeCustomChartId, isCustomSource, extractCustomUUID } from '@/lib/types/customSource';

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [customSources, setCustomSources] = useState<CustomDataSource[]>([]);

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

  // Fetch custom sources
  const fetchCustomSources = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-sources');
      const data = await res.json();
      setCustomSources(data.sources || []);
    } catch (error) {
      console.error('Failed to fetch custom sources:', error);
    }
  }, []);

  useEffect(() => {
    fetchCustomSources();
  }, [fetchCustomSources]);

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

  // Handler for when a source is added
  const handleSourceAdded = useCallback(async (sourceId: string, sectionId: string) => {
    const chartId = makeCustomChartId(sourceId);
    const res = await fetch(`/api/config/sections/${sectionId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chartId }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to add source to section');
    }

    // Refresh config and sources
    const configRes = await fetch('/api/config');
    const configData = await configRes.json();
    setConfig(configData);
    await fetchCustomSources();
  }, [fetchCustomSources]);

  // Handler for when a source is removed
  const handleSourceRemoved = useCallback(async (sourceId: string) => {
    if (!config) return;

    const chartId = makeCustomChartId(sourceId);

    // First, remove from all sections that contain this source
    for (const section of config.sections) {
      if (section.chartIds.includes(chartId)) {
        await fetch(`/api/config/sections/${section.id}/sources?chartId=${encodeURIComponent(chartId)}`, {
          method: 'DELETE',
        });
      }
    }

    // Then delete the source itself
    await fetch(`/api/custom-sources/${sourceId}`, {
      method: 'DELETE',
    });

    // Refresh config and sources
    const configRes = await fetch('/api/config');
    const configData = await configRes.json();
    setConfig(configData);
    await fetchCustomSources();
  }, [config, fetchCustomSources]);

  // Handler for when a source is updated (metadata changed)
  const handleSourceUpdated = useCallback(() => {
    fetchCustomSources();
  }, [fetchCustomSources]);

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

  // Get chart meta for active item (handles both built-in and custom sources)
  const getChartMetaForId = (chartId: string): FredChartMeta | null => {
    if (!chartId) return null;
    if (isCustomSource(chartId)) {
      const uuid = extractCustomUUID(chartId);
      const source = customSources.find(s => s.sourceId === uuid);
      if (!source || source.validationStatus !== 'valid') return null;
      return {
        id: chartId,
        title: source.title,
        description: source.description || '',
        file: '', // Not used for custom sources
        unit: source.unit,
        valueColumn: 'value',
      };
    }
    return FRED_CHARTS[chartId] || null;
  };

  const activeChartMeta = activeId ? getChartMetaForId(activeId) : null;

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
            {/* Settings button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                marginLeft: '16px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${dashboardTheme.colors.border}`,
                backgroundColor: dashboardTheme.colors.surface,
                color: dashboardTheme.colors.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = dashboardTheme.colors.borderStrong;
                e.currentTarget.style.backgroundColor = dashboardTheme.colors.surfaceAlt;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = dashboardTheme.colors.border;
                e.currentTarget.style.backgroundColor = dashboardTheme.colors.surface;
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M13.6 10.1L12.8 9.5C12.9 9 12.9 8.5 12.8 8L13.6 7.4C13.9 7.2 14 6.8 13.8 6.5L12.8 4.8C12.6 4.5 12.2 4.4 11.9 4.5L10.9 4.9C10.5 4.6 10.1 4.4 9.7 4.2L9.5 3.1C9.4 2.8 9.2 2.5 8.8 2.5H6.8C6.4 2.5 6.2 2.8 6.1 3.1L5.9 4.2C5.5 4.4 5.1 4.6 4.7 4.9L3.7 4.5C3.4 4.4 3 4.5 2.8 4.8L1.8 6.5C1.6 6.8 1.7 7.2 2 7.4L2.8 8C2.7 8.5 2.7 9 2.8 9.5L2 10.1C1.7 10.3 1.6 10.7 1.8 11L2.8 12.7C3 13 3.4 13.1 3.7 13L4.7 12.6C5.1 12.9 5.5 13.1 5.9 13.3L6.1 14.4C6.2 14.7 6.4 15 6.8 15H9.2C9.6 15 9.8 14.7 9.9 14.4L10.1 13.3C10.5 13.1 10.9 12.9 11.3 12.6L12.3 13C12.6 13.1 13 13 13.2 12.7L14.2 11C14.4 10.7 14.3 10.3 14 10.1L13.6 10.1Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Settings
            </button>
          </div>
        </div>

        {config.sections.map(section => (
          <DraggableSection
            key={section.id}
            id={section.id}
            name={section.name}
            chartIds={section.chartIds}
            customSources={customSources}
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

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        customSources={customSources}
        sections={config.sections}
        onSourceAdded={handleSourceAdded}
        onSourceRemoved={handleSourceRemoved}
        onSourceUpdated={handleSourceUpdated}
        onRefreshSources={fetchCustomSources}
      />
    </DndContext>
  );
}
