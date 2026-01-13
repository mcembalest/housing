// Chart type options for data sources
export type ChartType = 'line' | 'multiline' | 'bar' | 'map';

// Individual chart configuration within a data source
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description: string;
  dataKey: string;
  xKey?: string;
  groupBy?: string;
}

// Data source configuration
export interface DataSourceConfig {
  id: string;
  name: string;
  description: string;
  charts: ChartConfig[];
  source: {
    name: string;
    url: string;
    updateFrequency: string;
  };
  metros?: Record<string, { lat: number; lng: number }>;
}

// Raw housing data record
export interface HousingRecord {
  region: string;
  period: string;
  salesCount: number;
  inventory: number;
  newListings: number;
  daysOnMarket: number;
  priceReductionPct: number;
  medianPrice: number;
  segment: string;
}

// Processed timeseries data point
export interface TimeseriesPoint {
  period: string;
  turnoverRate: number;
  daysOnMarket: number;
}

// Calculated signals for a region
export interface AccelerationSignals {
  turnoverMomentum: { value: number; recent: number; prior: number };
  domMomentum: { value: number; recent: number; prior: number };
  priceReductionMomentum: { value: number; recent: number; prior: number };
  listingVelocityMomentum: { value: number; recent: number; prior: number };
}

// Processed region data with scoring
export interface RegionData {
  region: string;
  score: number;
  signals: AccelerationSignals;
  timeseries: TimeseriesPoint[];
  coordinates?: { lat: number; lng: number };
}

// Generic data source interface for the grid
export interface DataSource {
  config: DataSourceConfig;
  data: RegionData[];
}
