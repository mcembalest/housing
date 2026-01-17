'use client';

import { useState, useCallback } from 'react';
import { dashboardTheme } from '@/lib/dashboardTheme';
import { DashboardSection } from '@/lib/types';

interface AddSourceFormProps {
  sections: DashboardSection[];
  onCancel: () => void;
  onSave: (sourceId: string, sectionId: string) => Promise<void>;
}

interface ValidationResult {
  isValid: boolean;
  series?: {
    title: string;
    frequency: string;
    units: string;
    lastObservation?: string;
  };
  error?: string;
}

interface PreviewData {
  date: string;
  value: number;
}

export function AddSourceForm({ sections, onCancel, onSave }: AddSourceFormProps) {
  const [provider] = useState('fred');
  const [seriesId, setSeriesId] = useState('');
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');
  const [sectionId, setSectionId] = useState(sections[0]?.id || '');

  const [validationStatus, setValidationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track dirty state
  const isDirty = seriesId.trim() !== '' || title.trim() !== '' || description.trim() !== '';

  const handleValidate = useCallback(async () => {
    if (!seriesId.trim()) return;

    setValidationStatus('loading');
    setError(null);
    setValidationResult(null);

    try {
      const res = await fetch('/api/custom-sources/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seriesId: seriesId.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setValidationStatus('error');
        setValidationResult({ isValid: false, error: data.message || 'Validation failed' });
        return;
      }

      if (data.isValid && data.series) {
        setValidationStatus('success');
        setValidationResult(data);
        // Auto-fill title and unit from provider metadata
        setTitle(data.series.title);
        setUnit(data.series.units);
      } else {
        setValidationStatus('error');
        setValidationResult({ isValid: false, error: data.error || 'Series not found' });
      }
    } catch {
      setValidationStatus('error');
      setValidationResult({ isValid: false, error: 'Failed to validate series' });
    }
  }, [seriesId]);

  const handleTogglePreview = useCallback(async () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    if (validationStatus !== 'success' || !seriesId.trim()) return;

    setPreviewLoading(true);
    setShowPreview(true);

    try {
      // Fetch a few data points using the FRED observations endpoint
      const apiKey = process.env.NEXT_PUBLIC_FRED_API_KEY;
      if (!apiKey) {
        // Fall back to showing message without preview
        setPreviewData([]);
        setPreviewLoading(false);
        return;
      }

      const params = new URLSearchParams({
        series_id: seriesId.trim().toUpperCase(),
        api_key: apiKey,
        file_type: 'json',
        sort_order: 'desc',
        limit: '5',
      });

      const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.observations) {
          const preview = data.observations
            .filter((obs: { value: string }) => obs.value !== '.')
            .map((obs: { date: string; value: string }) => ({
              date: obs.date,
              value: parseFloat(obs.value),
            }))
            .reverse();
          setPreviewData(preview);
        }
      }
    } catch {
      // Preview is non-critical, just show empty
    } finally {
      setPreviewLoading(false);
    }
  }, [showPreview, validationStatus, seriesId]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (window.confirm('Discard unsaved changes?')) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  const handleSave = useCallback(async () => {
    if (validationStatus !== 'success' || !title.trim() || !unit.trim() || !sectionId) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Step 1: Create the custom source
      const createRes = await fetch('/api/custom-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          providerSourceId: seriesId.trim().toUpperCase(),
          title: title.trim(),
          description: description.trim() || null,
          unit: unit.trim(),
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData.message || 'Failed to create source');
      }

      const sourceId = createData.source.sourceId;

      // Step 2: Add to section
      try {
        await onSave(sourceId, sectionId);
      } catch (addError) {
        // Source was created but adding to section failed
        // Show warning but don't fail completely
        setError(
          `Source created but failed to add to section: ${addError instanceof Error ? addError.message : 'Unknown error'}. You can add it manually.`
        );
        setSaving(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source');
      setSaving(false);
    }
  }, [validationStatus, title, unit, sectionId, provider, seriesId, description, onSave]);

  const formStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderTop: `1px solid ${dashboardTheme.colors.border}`,
  };

  const formTitleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: dashboardTheme.colors.text,
    marginBottom: '16px',
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '16px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: dashboardTheme.colors.textMuted,
    marginBottom: '6px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${dashboardTheme.colors.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: dashboardTheme.colors.text,
    backgroundColor: dashboardTheme.colors.surface,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '60px',
  };

  const inputRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
  };

  const validateButtonStyle: React.CSSProperties = {
    padding: '10px 16px',
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    color: dashboardTheme.colors.text,
    border: `1px solid ${dashboardTheme.colors.border}`,
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'background-color 0.15s ease',
  };

  const validationMessageStyle: React.CSSProperties = {
    marginTop: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
  };

  const previewToggleStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 0',
    color: dashboardTheme.colors.accent,
    fontSize: '12px',
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
  };

  const previewStyle: React.CSSProperties = {
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '16px',
  };

  const previewRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: dashboardTheme.colors.text,
    padding: '4px 0',
    borderBottom: `1px solid ${dashboardTheme.colors.border}`,
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '24px',
  };

  const cancelButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: dashboardTheme.colors.surfaceAlt,
    color: dashboardTheme.colors.text,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  const saveButtonStyle: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: dashboardTheme.colors.brand,
    color: dashboardTheme.colors.textInverse,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: validationStatus === 'success' && !saving ? 'pointer' : 'not-allowed',
    opacity: validationStatus === 'success' && !saving ? 1 : 0.5,
    transition: 'background-color 0.15s ease',
  };

  const errorStyle: React.CSSProperties = {
    padding: '10px 12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '16px',
  };

  return (
    <div style={formStyle}>
      <div style={formTitleStyle}>Add Data Source</div>

      {error && <div style={errorStyle}>{error}</div>}

      {/* Provider */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Provider</label>
        <select style={selectStyle} value={provider} disabled>
          <option value="fred">FRED (Federal Reserve Economic Data)</option>
        </select>
      </div>

      {/* Series ID */}
      <div style={fieldStyle}>
        <label style={labelStyle}>Series ID</label>
        <div style={inputRowStyle}>
          <input
            type="text"
            style={{ ...inputStyle, flex: 1 }}
            value={seriesId}
            onChange={e => {
              setSeriesId(e.target.value);
              setValidationStatus('idle');
              setValidationResult(null);
            }}
            placeholder="e.g., GDP, UNRATE, CPIAUCSL"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidate();
              }
            }}
          />
          <button
            style={validateButtonStyle}
            onClick={handleValidate}
            disabled={!seriesId.trim() || validationStatus === 'loading'}
            onMouseEnter={e => {
              if (seriesId.trim()) {
                e.currentTarget.style.backgroundColor = dashboardTheme.colors.borderStrong;
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = dashboardTheme.colors.surfaceAlt;
            }}
          >
            {validationStatus === 'loading' ? 'Validating...' : 'Validate'}
          </button>
        </div>

        {/* Validation result */}
        {validationStatus === 'success' && validationResult?.series && (
          <div
            style={{
              ...validationMessageStyle,
              backgroundColor: '#dcfce7',
              color: '#166534',
            }}
          >
            <strong>Valid:</strong> {validationResult.series.title}
            <br />
            <span style={{ fontSize: '11px', opacity: 0.8 }}>
              Frequency: {validationResult.series.frequency} | Units: {validationResult.series.units}
              {validationResult.series.lastObservation && ` | Last: ${validationResult.series.lastObservation}`}
            </span>
          </div>
        )}

        {validationStatus === 'error' && validationResult && (
          <div
            style={{
              ...validationMessageStyle,
              backgroundColor: '#fee2e2',
              color: '#dc2626',
            }}
          >
            {validationResult.error || 'Series not found'}
          </div>
        )}
      </div>

      {/* Preview toggle */}
      {validationStatus === 'success' && (
        <button style={previewToggleStyle} onClick={handleTogglePreview}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{ transform: showPreview ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
          >
            <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      )}

      {/* Preview data */}
      {showPreview && validationStatus === 'success' && (
        <div style={previewStyle}>
          {previewLoading ? (
            <div style={{ textAlign: 'center', color: dashboardTheme.colors.textMuted, fontSize: '12px' }}>
              Loading preview...
            </div>
          ) : previewData.length > 0 ? (
            <>
              <div style={{ ...previewRowStyle, fontWeight: 600, borderBottom: `2px solid ${dashboardTheme.colors.border}` }}>
                <span>Date</span>
                <span>Value</span>
              </div>
              {previewData.map((point, i) => (
                <div key={i} style={{ ...previewRowStyle, borderBottom: i === previewData.length - 1 ? 'none' : undefined }}>
                  <span>{point.date}</span>
                  <span>{point.value.toLocaleString()}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: dashboardTheme.colors.textMuted, fontSize: '12px' }}>
              Preview not available
            </div>
          )}
        </div>
      )}

      {/* Title */}
      {validationStatus === 'success' && (
        <>
          <div style={fieldStyle}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              style={inputStyle}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Display title for the chart"
            />
          </div>

          {/* Unit */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Unit</label>
            <input
              type="text"
              style={inputStyle}
              value={unit}
              onChange={e => setUnit(e.target.value)}
              placeholder="e.g., %, Index, B$"
            />
          </div>

          {/* Description */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              style={textareaStyle}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the data series"
            />
          </div>

          {/* Section */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Add to Section</label>
            <select
              style={selectStyle}
              value={sectionId}
              onChange={e => setSectionId(e.target.value)}
            >
              {sections.map(section => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Buttons */}
      <div style={buttonRowStyle}>
        <button style={cancelButtonStyle} onClick={handleCancel}>
          Cancel
        </button>
        <button
          style={saveButtonStyle}
          onClick={handleSave}
          disabled={validationStatus !== 'success' || !title.trim() || !unit.trim() || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
