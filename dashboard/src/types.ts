export interface YieldRecord {
  id: string;
  idNumber: string;
  officer: string;
  location: string;
  treesInSample: number;
  totalPods: number;
  area: number;
  treeDensity: number;
  podsPerTree: number;
  yieldPerHa: number;
  volume: number;
  adjustmentPercentage: number;
  lastYearProduction: number;
  conditions: Record<string, boolean>;
  timestamp: string;
  gps?: string;
}

export interface PaginatedRecordsResponse {
  data: YieldRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AggregatedKpis {
  totals: {
    records: number;
    farmers: number;
    totalVolume: number;
    averageYield: number;
    averageVolume: number;
  };
  byLocation: {
    location: string;
    totalVolume: number;
    averageYield: number;
    records: number;
  }[];
  byOfficer: {
    officer: string;
    totalVolume: number;
    averageYield: number;
    records: number;
  }[];
  monthlyVolume: { month: string; totalVolume: number }[];
  monthlyLocationSeries: Record<string, { month: string; totalVolume: number }[]>;
  monthlyOfficerSeries: Record<string, { month: string; totalVolume: number }[]>;
}
