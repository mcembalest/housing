'use client';

import { useState, useCallback } from 'react';
import { dashboardTheme } from '@/lib/dashboardTheme';
import { CustomDataSource } from '@/lib/types/customSource';
import { DashboardSection } from '@/lib/types';
import { SERIES_REGISTRY } from '@/lib/data/seriesRegistry';
import { AddSourceForm } from './AddSourceForm';

interface DataSourcesTabProps {
  customSources: CustomDataSource[];
  sections: DashboardSection[];
  onSourceAdded: (sourceId: string, sectionId: string) => Promise<void>;
  onSourceRemoved: (sourceId: string) => Promise<void>;
  onSourceUpdated: () => void;
}

export function DataSourcesTab({
  customSources,
  sections,
  onSourceAdded,
  onSourceRemoved,
  onSourceUpdated,
}: DataSourcesTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [builtInCollapsed, setBuiltInCollapsed] = useState(true);
  const [customCollapsed, setCustomCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; unit: string }>({ title: '', unit: '' });
  const [error, setError] = useState<string | null>(null);

  const builtInSources = Object.values(SERIES_REGISTRY);

  const handleRefresh = useCallback(async (sourceId: string) => {
    setRefreshingId(sourceId);
    setError(null);

    try {
      const res = await fetch(`/api/custom-sources/${sourceId}/refresh`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to refresh');
      }

      onSourceUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh source');
    } finally {
      setRefreshingId(null);
    }
  }, [onSourceUpdated]);

  const handleDelete = useCallback(async (sourceId: string) => {
    setDeletingId(sourceId);
    setError(null);

    try {
      await onSourceRemoved(sourceId);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
    } finally {
      setDeletingId(null);
    }
  }, [onSourceRemoved]);

  const handleStartEdit = useCallback((source: CustomDataSource) => {
    setEditingId(source.sourceId);
    setEditForm({ title: source.title, unit: source.unit });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({ title: '', unit: '' });
  }, []);

  const handleSaveEdit = useCallback(async (sourceId: string) => {
    setError(null);

    try {
      const res = await fetch(`/api/custom-sources/${sourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update');
      }

      setEditingId(null);
      setEditForm({ title: '', unit: '' });
      onSourceUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
    }
  }, [editForm, onSourceUpdated]);

  const sectionStyle: React.CSSProperties = {
    borderBottom: `1px solid ${dashboardTheme.colors.border}`,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: dashboardTheme.colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const countBadgeStyle: React.CSSProperties = {
    fontSize: '12px',
    color: dashboardTheme.colors.textMuted,
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    padding: '2px 8px',
    borderRadius: '12px',
  };

  const collapseIconStyle: React.CSSProperties = {
    color: dashboardTheme.colors.textMuted,
    transition: 'transform 0.2s ease',
  };

  const listStyle: React.CSSProperties = {
    padding: '0 24px 16px',
  };

  const sourceRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: `1px solid ${dashboardTheme.colors.border}`,
  };

  const sourceInfoStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 0,
  };

  const sourceTitleStyle: React.CSSProperties = {
    fontSize: '13px',
    color: dashboardTheme.colors.text,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const providerBadgeStyle: React.CSSProperties = {
    fontSize: '10px',
    textTransform: 'uppercase',
    color: dashboardTheme.colors.textMuted,
    backgroundColor: dashboardTheme.colors.brandSoft,
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '8px',
  };

  const actionsStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginLeft: '8px',
  };

  const iconButtonStyle: React.CSSProperties = {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: dashboardTheme.colors.textMuted,
    transition: 'background-color 0.15s ease',
  };

  const addButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    margin: '16px 24px',
    backgroundColor: dashboardTheme.colors.brand,
    color: dashboardTheme.colors.textInverse,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    color: dashboardTheme.colors.textMuted,
    fontSize: '13px',
  };

  const errorStyle: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    fontSize: '13px',
  };

  const confirmDialogStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    borderRadius: '8px',
    marginTop: '8px',
  };

  const editFormStyle: React.CSSProperties = {
    padding: '12px',
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    borderRadius: '8px',
    marginTop: '8px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${dashboardTheme.colors.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '8px',
  };

  const smallButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div>
      {error && <div style={errorStyle}>{error}</div>}

      {/* Built-in Sources */}
      <div style={sectionStyle}>
        <div
          style={sectionHeaderStyle}
          onClick={() => setBuiltInCollapsed(!builtInCollapsed)}
        >
          <span style={sectionTitleStyle}>
            Built-in Sources
            <span style={countBadgeStyle}>{builtInSources.length}</span>
          </span>
          <span style={{ ...collapseIconStyle, transform: builtInCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        {!builtInCollapsed && (
          <div style={{ ...listStyle, opacity: 0.7 }}>
            {builtInSources.map(source => (
              <div key={source.id} style={{ ...sourceRowStyle, cursor: 'default' }}>
                <div style={sourceInfoStyle}>
                  <span style={sourceTitleStyle}>
                    {source.title}
                    <span style={providerBadgeStyle}>{source.provider}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Sources */}
      <div style={sectionStyle}>
        <div
          style={sectionHeaderStyle}
          onClick={() => setCustomCollapsed(!customCollapsed)}
        >
          <span style={sectionTitleStyle}>
            Custom Sources
            <span style={countBadgeStyle}>{customSources.length}</span>
          </span>
          <span style={{ ...collapseIconStyle, transform: customCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        {!customCollapsed && (
          <div style={listStyle}>
            {customSources.length === 0 ? (
              <div style={emptyStateStyle}>
                <p>No custom data sources yet.</p>
                <button
                  style={{ ...addButtonStyle, margin: '16px auto 0' }}
                  onClick={() => setShowAddForm(true)}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = dashboardTheme.colors.brandStrong;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = dashboardTheme.colors.brand;
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Add your first data source
                </button>
              </div>
            ) : (
              <>
                {customSources.map(source => (
                  <div key={source.sourceId}>
                    <div style={sourceRowStyle}>
                      <div style={sourceInfoStyle}>
                        <span style={sourceTitleStyle}>
                          {source.title}
                          <span style={providerBadgeStyle}>{source.provider}</span>
                          {source.validationStatus === 'invalid' && (
                            <span style={{ ...providerBadgeStyle, backgroundColor: '#fee2e2', color: '#dc2626' }}>
                              Invalid
                            </span>
                          )}
                        </span>
                      </div>
                      <div style={actionsStyle}>
                        <button
                          style={iconButtonStyle}
                          onClick={() => handleStartEdit(source)}
                          title="Edit"
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = dashboardTheme.colors.surfaceAlt;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M10 2L12 4L5 11H3V9L10 2Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          style={iconButtonStyle}
                          onClick={() => handleRefresh(source.sourceId)}
                          disabled={refreshingId === source.sourceId}
                          title="Refresh"
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = dashboardTheme.colors.surfaceAlt;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {refreshingId === source.sourceId ? (
                            <span style={{ fontSize: '12px' }}>...</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M1 7C1 10.3137 3.68629 13 7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C4.5 1 2.5 2.5 1.5 4.5M1 1.5V4.5H4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          style={iconButtonStyle}
                          onClick={() => setConfirmDeleteId(source.sourceId)}
                          disabled={deletingId === source.sourceId}
                          title="Remove"
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = '#fee2e2';
                            e.currentTarget.style.color = '#dc2626';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = dashboardTheme.colors.textMuted;
                          }}
                        >
                          {deletingId === source.sourceId ? (
                            <span style={{ fontSize: '12px' }}>...</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M2 4H12M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M11 4V11C11 11.5523 10.5523 12 10 12H4C3.44772 12 3 11.5523 3 11V4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Edit form */}
                    {editingId === source.sourceId && (
                      <div style={editFormStyle}>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Title"
                          style={inputStyle}
                        />
                        <input
                          type="text"
                          value={editForm.unit}
                          onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))}
                          placeholder="Unit"
                          style={inputStyle}
                        />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            style={{ ...smallButtonStyle, backgroundColor: dashboardTheme.colors.surfaceAlt, color: dashboardTheme.colors.text }}
                            onClick={handleCancelEdit}
                          >
                            Cancel
                          </button>
                          <button
                            style={{ ...smallButtonStyle, backgroundColor: dashboardTheme.colors.brand, color: dashboardTheme.colors.textInverse }}
                            onClick={() => handleSaveEdit(source.sourceId)}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Delete confirmation */}
                    {confirmDeleteId === source.sourceId && (
                      <div style={confirmDialogStyle}>
                        <p style={{ margin: '0 0 12px', fontSize: '13px', color: dashboardTheme.colors.text }}>
                          Remove &quot;{source.title}&quot;? This will also remove it from all sections.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            style={{ ...smallButtonStyle, backgroundColor: dashboardTheme.colors.surfaceAlt, color: dashboardTheme.colors.text }}
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            style={{ ...smallButtonStyle, backgroundColor: '#dc2626', color: 'white' }}
                            onClick={() => handleDelete(source.sourceId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add button (only show if custom sources exist and form is not open) */}
      {!showAddForm && customSources.length > 0 && (
        <button
          style={addButtonStyle}
          onClick={() => setShowAddForm(true)}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = dashboardTheme.colors.brandStrong;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = dashboardTheme.colors.brand;
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Data Source
        </button>
      )}

      {/* Add form */}
      {showAddForm && (
        <AddSourceForm
          sections={sections}
          onCancel={() => setShowAddForm(false)}
          onSave={async (sourceId, sectionId) => {
            await onSourceAdded(sourceId, sectionId);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}
