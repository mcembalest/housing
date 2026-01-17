// Custom Data Source Types

export interface CustomDataSource {
  id: number;                      // DB serial (internal only)
  sourceId: string;                // UUID - use this for refs
  provider: string;
  providerSourceId: string;
  title: string;
  description: string | null;
  unit: string;
  providerTitle: string | null;
  providerUnits: string | null;
  providerFrequency: string | null;
  validationStatus: 'pending' | 'valid' | 'invalid';
  lastValidationError: string | null;
  lastValidatedAt: string | null;
  frequency: string;
  staleAfterHours: number;
  createdAt: string;
  updatedAt: string;
}

// Unified chart meta shape (works for both built-in and custom)
export interface ChartMeta {
  id: string;          // Chart ID (built-in key or "custom:{uuid}")
  title: string;
  description: string;
  unit: string;
  provider: 'fred' | string;
  isCustom: boolean;
}

// Helper functions for chart ID handling
export function isCustomSource(chartId: string): boolean {
  return chartId.startsWith('custom:');
}

export function extractCustomUUID(chartId: string): string {
  return chartId.slice(7); // Remove "custom:" prefix
}

export function makeCustomChartId(uuid: string): string {
  return `custom:${uuid}`;
}

// Validation response from FRED
export interface FredSeriesValidation {
  isValid: boolean;
  series?: {
    title: string;
    frequency: string;
    units: string;
    lastObservation?: string;
  };
  error?: string;
}

// API response types
export interface CustomSourceCreateRequest {
  provider: string;
  providerSourceId: string;
  title: string;
  description?: string;
  unit: string;
}

export interface CustomSourceUpdateRequest {
  title?: string;
  description?: string;
  unit?: string;
}

// DB row type (snake_case from Postgres)
export interface CustomDataSourceRow {
  id: number;
  source_id: string;
  provider: string;
  provider_source_id: string;
  title: string;
  description: string | null;
  unit: string;
  provider_title: string | null;
  provider_units: string | null;
  provider_frequency: string | null;
  validation_status: string;
  last_validation_error: string | null;
  last_validated_at: string | null;
  frequency: string;
  stale_after_hours: number;
  created_at: string;
  updated_at: string;
}

// Convert DB row to API response format
export function rowToCustomSource(row: CustomDataSourceRow): CustomDataSource {
  return {
    id: row.id,
    sourceId: row.source_id,
    provider: row.provider,
    providerSourceId: row.provider_source_id,
    title: row.title,
    description: row.description,
    unit: row.unit,
    providerTitle: row.provider_title,
    providerUnits: row.provider_units,
    providerFrequency: row.provider_frequency,
    validationStatus: row.validation_status as 'pending' | 'valid' | 'invalid',
    lastValidationError: row.last_validation_error,
    lastValidatedAt: row.last_validated_at,
    frequency: row.frequency,
    staleAfterHours: row.stale_after_hours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
