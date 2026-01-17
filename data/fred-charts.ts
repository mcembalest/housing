// Chart metadata registry for FRED data
export interface FredChartMeta {
  id: string;
  title: string;
  description: string;
  file: string;
  unit: string;
  valueColumn: string;
}

export const FRED_CHARTS: Record<string, FredChartMeta> = {
  // Affordability Indicators
  mortgage_rates: {
    id: 'mortgage_rates',
    title: '30-Year Mortgage Rate',
    description: 'Weekly average 30-year fixed mortgage rate',
    file: 'mortgage_rates.csv',
    unit: '%',
    valueColumn: 'rate',
  },
  interest_rates: {
    id: 'interest_rates',
    title: 'Federal Funds Rate',
    description: 'Federal Reserve interest rate target',
    file: 'interest_rates.csv',
    unit: '%',
    valueColumn: 'rate',
  },
  housing_prices_case_shiller: {
    id: 'housing_prices_case_shiller',
    title: 'Case-Shiller Home Prices',
    description: 'S&P/Case-Shiller U.S. National Home Price Index',
    file: 'housing_prices_case_shiller.csv',
    unit: 'Index',
    valueColumn: 'index',
  },
  housing_affordability: {
    id: 'housing_affordability',
    title: 'Housing Affordability Index',
    description: 'NAR Housing Affordability Index',
    file: 'housing_affordability.csv',
    unit: 'Index',
    valueColumn: 'index',
  },
  customs_duties: {
    id: 'customs_duties',
    title: 'Customs Duties (Tariffs)',
    description: 'Federal tariff revenue collections',
    file: 'customs_duties.csv',
    unit: 'B$',
    valueColumn: 'receipts',
  },

  // Liquidity Indicators
  housing_starts: {
    id: 'housing_starts',
    title: 'Housing Starts',
    description: 'Total new residential construction starts',
    file: 'housing_starts.csv',
    unit: 'K',
    valueColumn: 'starts',
  },
  housing_starts_single_family: {
    id: 'housing_starts_single_family',
    title: 'Single-Family Starts',
    description: 'Single-family residential construction starts',
    file: 'housing_starts_single_family.csv',
    unit: 'K',
    valueColumn: 'starts',
  },
  building_permits: {
    id: 'building_permits',
    title: 'Building Permits',
    description: 'New residential building permits issued',
    file: 'building_permits.csv',
    unit: 'K',
    valueColumn: 'permits',
  },
  existing_home_sales: {
    id: 'existing_home_sales',
    title: 'Existing Home Sales',
    description: 'Existing home sales volume',
    file: 'existing_home_sales.csv',
    unit: 'M',
    valueColumn: 'sales',
  },

  // Consumer Willingness Indicators
  unemployment_rate: {
    id: 'unemployment_rate',
    title: 'Unemployment Rate',
    description: 'U.S. national unemployment rate',
    file: 'unemployment_rate.csv',
    unit: '%',
    valueColumn: 'rate',
  },
  nonfarm_payrolls: {
    id: 'nonfarm_payrolls',
    title: 'Nonfarm Payrolls',
    description: 'Total nonfarm employment levels',
    file: 'nonfarm_payrolls.csv',
    unit: 'K',
    valueColumn: 'employment',
  },
  economic_policy_uncertainty: {
    id: 'economic_policy_uncertainty',
    title: 'Economic Policy Uncertainty',
    description: 'Economic Policy Uncertainty Index',
    file: 'economic_policy_uncertainty.csv',
    unit: 'Index',
    valueColumn: 'index',
  },
  trade_policy_uncertainty: {
    id: 'trade_policy_uncertainty',
    title: 'Trade Policy Uncertainty',
    description: 'Trade Policy Uncertainty Index',
    file: 'trade_policy_uncertainty.csv',
    unit: 'Index',
    valueColumn: 'index',
  },
  vix: {
    id: 'vix',
    title: 'VIX',
    description: 'CBOE Volatility Index (market fear gauge)',
    file: 'vix.csv',
    unit: 'Index',
    valueColumn: 'vix',
  },
};

export const CHART_IDS = Object.keys(FRED_CHARTS);

export function getChartMeta(chartId: string): FredChartMeta | undefined {
  return FRED_CHARTS[chartId];
}
