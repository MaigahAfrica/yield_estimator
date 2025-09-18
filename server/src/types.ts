export type UserRole = 'field_officer' | 'dashboard_admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
}

export interface RecordConditions {
  [key: string]: boolean;
}

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
  conditions: RecordConditions;
  timestamp: string;
  gps?: string;
}

export interface DatabaseSchema {
  users: User[];
  records: YieldRecord[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> extends PaginationMeta {
  data: T[];
}
