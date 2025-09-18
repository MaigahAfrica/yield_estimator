import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import apiClient from '../api/client';
import type { AggregatedKpis } from '../types';
import KpiCard from '../components/KpiCard';
import RecordsFilterBar, { type RecordsFilterState } from '../components/RecordsFilterBar';
import TrendChart from '../components/TrendChart';

export function DashboardPage() {
  const [filters, setFilters] = useState<RecordsFilterState>({});
  const [kpis, setKpis] = useState<AggregatedKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchKpis() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<AggregatedKpis>('/records/kpis', {
          params: filters,
          signal: controller.signal,
        });
        setKpis(response.data);
      } catch (err: any) {
        if (err.name !== 'CanceledError') {
          setError(err.response?.data?.message ?? 'Unable to load KPIs');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
    return () => controller.abort();
  }, [filters]);

  const monthSummary = useMemo(() => {
    if (!kpis) return null;
    const latest = [...kpis.monthlyVolume].sort((a, b) => b.month.localeCompare(a.month))[0];
    if (!latest) return null;
    return `${format(new Date(`${latest.month}-01`), 'LLLL yyyy')}: ${latest.totalVolume.toLocaleString()} kg`;
  }, [kpis]);

  return (
    <div className="dashboard-page">
      <RecordsFilterBar
        filters={filters}
        onApply={(next) => setFilters(next)}
        onReset={() => setFilters({})}
        showExportButtons={false}
      />
      {loading && <p className="info-text">Loading KPIs…</p>}
      {error && <div className="alert">{error}</div>}
      {kpis && (
        <>
          <section className="kpi-grid">
            <KpiCard label="Records" value={kpis.totals.records} description="Total inspections captured" />
            <KpiCard label="Unique farmers" value={kpis.totals.farmers} description="Distinct farmer IDs" />
            <KpiCard label="Total volume (kg)" value={kpis.totals.totalVolume.toLocaleString()} description={monthSummary ?? undefined} />
            <KpiCard
              label="Average yield (kg/ha)"
              value={kpis.totals.averageYield.toFixed(1)}
              description="Across filtered records"
            />
            <KpiCard
              label="Average volume (kg)"
              value={kpis.totals.averageVolume.toFixed(1)}
              description="Per visit"
            />
          </section>

          <section className="chart-grid">
            <TrendChart
              title="Monthly volume trend"
              series={{ Total: kpis.monthlyVolume.map((item) => ({ month: item.month, totalVolume: item.totalVolume })) }}
            />
            <TrendChart title="Volume by location" series={kpis.monthlyLocationSeries} />
            <TrendChart title="Volume by officer" series={kpis.monthlyOfficerSeries} />
          </section>

          <section className="summary-lists">
            <div>
              <h3>Top societies by volume</h3>
              <ul>
                {kpis.byLocation.map((entry) => (
                  <li key={entry.location}>
                    <strong>{entry.location}</strong>: {entry.totalVolume.toLocaleString()} kg • Avg yield{' '}
                    {entry.averageYield.toFixed(1)} kg/ha
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Officer performance</h3>
              <ul>
                {kpis.byOfficer.map((entry) => (
                  <li key={entry.officer}>
                    <strong>{entry.officer}</strong>: {entry.totalVolume.toLocaleString()} kg • Avg yield{' '}
                    {entry.averageYield.toFixed(1)} kg/ha
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default DashboardPage;
