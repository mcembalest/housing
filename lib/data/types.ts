// Core types for the flexible data provider system

export interface DataPoint {
  date: string;   // Always YYYY-MM-DD (normalized)
  value: number;
}

export interface SeriesConfig {
  id: string;                    // Unique identifier
  provider: string;              // 'fred' | 'zillow' | 'census' | etc.
  sourceId: string;              // Provider-specific ID (e.g., 'MORTGAGE30US')
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  staleAfterHours: number;       // When to trigger refresh
  cacheFile: string;             // Path relative to /data/
  // Metadata for display
  title: string;
  description: string;
  unit: string;
  valueColumn: string;           // Column name in CSV
}

export interface DataProvider {
  name: string;
  supportsIncremental: boolean;  // false = always fetch full history and rewrite
  fetchSeries(sourceId: string, since?: string): Promise<DataPoint[]>;
}

export interface SeriesCacheMeta {
  provider: string;
  lastFetched: string;       // ISO timestamp
  lastDataDate: string;      // Last observation date
  etag?: string;             // For HTTP caching if provider supports
  lastError?: string;        // Last error message
  backoffUntil?: string;     // Don't retry until this time (exponential backoff)
}

export interface CacheMeta {
  [seriesId: string]: SeriesCacheMeta;
}

// Helper for consistent date handling
export function normalizeDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];  // YYYY-MM-DD
}

// Helper to add days to a date
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return normalizeDate(date);
}
