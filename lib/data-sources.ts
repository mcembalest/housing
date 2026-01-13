import { DataSource, DataSourceConfig, RegionData } from './types';
import { loadHousingData, config as housingConfig } from '@/data/housing-turnover';

// Registry of all data sources
// To add a new data source:
// 1. Create a new directory under data/
// 2. Add config.ts, data.ts, and index.ts
// 3. Register it here

interface DataSourceRegistry {
  [id: string]: {
    config: DataSourceConfig;
    load: () => RegionData[];
  };
}

const registry: DataSourceRegistry = {
  'housing-turnover': {
    config: housingConfig,
    load: loadHousingData,
  },
  // Add new data sources here:
  // 'rental-prices': {
  //   config: rentalConfig,
  //   load: loadRentalData,
  // },
};

export function getAllDataSources(): DataSource[] {
  return Object.entries(registry).map(([id, source]) => ({
    config: source.config,
    data: source.load(),
  }));
}

export function getDataSource(id: string): DataSource | null {
  const source = registry[id];
  if (!source) return null;

  return {
    config: source.config,
    data: source.load(),
  };
}

export function getDataSourceIds(): string[] {
  return Object.keys(registry);
}
