import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import type { PaginatedRecordsResponse, YieldRecord } from '../types';
import RecordsFilterBar, { type RecordsFilterState } from '../components/RecordsFilterBar';
import RecordsTable from '../components/RecordsTable';

export function RecordsPage() {
  const [filters, setFilters] = useState<RecordsFilterState>({});
  const [records, setRecords] = useState<YieldRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<PaginatedRecordsResponse>('/records', {
        params: {
          ...filters,
          page,
          pageSize,
        },
      });
      setRecords(response.data.data);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to load records');
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleApply = (nextFilters: RecordsFilterState) => {
    setPage(1);
    setFilters(nextFilters);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      const response = await apiClient.get(`/records/export`, {
        params: { ...filters, format, page: undefined, pageSize: undefined },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type:
          format === 'csv'
            ? 'text/csv;charset=utf-8;'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `yield-records.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Unable to export records');
    }
  };

  return (
    <div className="records-page">
      <RecordsFilterBar filters={filters} onApply={handleApply} onReset={handleReset} onExport={handleExport} />
      {loading && <p className="info-text">Loading records…</p>}
      {error && <div className="alert">{error}</div>}
      <RecordsTable
        data={records}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => {
          if (nextPage < 1) return;
          setPage(nextPage);
        }}
        onPageSizeChange={(size) => {
          setPage(1);
          setPageSize(size);
        }}
      />
    </div>
  );
}

export default RecordsPage;
