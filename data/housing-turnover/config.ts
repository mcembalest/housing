import { DataSourceConfig } from '@/lib/types';

const config: DataSourceConfig = {
  id: 'housing-turnover',
  name: 'Housing Turnover',
  description: 'High-income housing turnover across major US metros',

  // Chart configuration
  charts: [
    {
      id: 'turnover-trend',
      type: 'line',
      title: 'Turnover Rate Trend',
      description: 'Sales volume relative to inventory over time',
      dataKey: 'turnoverRate',
      xKey: 'period',
    },
    {
      id: 'days-on-market',
      type: 'line',
      title: 'Days on Market',
      description: 'Median days homes spend on the market',
      dataKey: 'daysOnMarket',
      xKey: 'period',
    },
    {
      id: 'metro-comparison',
      type: 'multiline',
      title: 'Metro Comparison',
      description: 'Compare turnover rates across metros',
      dataKey: 'turnoverRate',
      xKey: 'period',
      groupBy: 'region',
    },
    {
      id: 'acceleration-bars',
      type: 'bar',
      title: 'Acceleration Score',
      description: 'Market momentum ranking by metro',
      dataKey: 'accelerationScore',
      xKey: 'region',
    },
    {
      id: 'hotspot-map',
      type: 'map',
      title: 'Hotspot Map',
      description: 'Geographic view of high-turnover metros',
      dataKey: 'accelerationScore',
    },
  ],

  // Data source metadata
  source: {
    name: 'Redfin Data Center',
    url: 'https://www.redfin.com/news/data-center/',
    updateFrequency: 'monthly',
  },

  // Metro coordinates for map
  metros: {
    'Austin': { lat: 30.2672, lng: -97.7431 },
    'Boston': { lat: 42.3601, lng: -71.0589 },
    'Chicago': { lat: 41.8781, lng: -87.6298 },
    'Denver': { lat: 39.7392, lng: -104.9903 },
    'Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'Miami': { lat: 25.7617, lng: -80.1918 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Phoenix': { lat: 33.4484, lng: -112.0740 },
    'San Francisco': { lat: 37.7749, lng: -122.4194 },
    'Seattle': { lat: 47.6062, lng: -122.3321 },
  },
};

export default config;
