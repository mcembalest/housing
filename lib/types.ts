// FRED Data Types
export interface FredDataPoint {
  date: string;
  value: number;
}

export interface FredChartData {
  chartId: string;
  meta: {
    id: string;
    title: string;
    description: string;
    file: string;
    unit: string;
    valueColumn: string;
  };
  data: FredDataPoint[];
}

// Dashboard Configuration Types
export interface DashboardSection {
  id: string;
  name: string;
  chartIds: string[];
}

export interface DashboardConfig {
  sections: DashboardSection[];
}
