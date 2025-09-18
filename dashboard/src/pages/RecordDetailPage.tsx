import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import type { YieldRecord } from '../types';

export function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<YieldRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    async function fetchRecord() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<YieldRecord>(`/records/${id}`);
        if (active) {
          setRecord(response.data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.response?.data?.message ?? 'Unable to load record');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    fetchRecord();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <p className="info-text">Loading record…</p>;
  }

  if (error) {
    return (
      <div className="alert">
        {error}
        <div>
          <Link to="/records">Back to records</Link>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="alert">
        Record not found.
        <div>
          <Link to="/records">Back to records</Link>
        </div>
      </div>
    );
  }

  const activeConditions = Object.entries(record.conditions)
    .filter(([, value]) => value)
    .map(([label]) => label);

  return (
    <div className="record-detail">
      <div className="record-detail__header">
        <h1>Farmer {record.idNumber}</h1>
        <Link to="/records" className="btn">
          ← Back to records
        </Link>
      </div>

      <section className="detail-grid">
        <div className="detail-card">
          <h2>Field visit</h2>
          <ul>
            <li>
              <span>Date</span>
              <strong>{new Date(record.timestamp).toLocaleString()}</strong>
            </li>
            <li>
              <span>Field officer</span>
              <strong>{record.officer}</strong>
            </li>
            <li>
              <span>Society / location</span>
              <strong>{record.location}</strong>
            </li>
            <li>
              <span>GPS</span>
              <strong>{record.gps ?? 'Not captured'}</strong>
            </li>
          </ul>
        </div>

        <div className="detail-card">
          <h2>Yield metrics</h2>
          <ul>
            <li>
              <span>Trees sampled</span>
              <strong>{record.treesInSample}</strong>
            </li>
            <li>
              <span>Total pods</span>
              <strong>{record.totalPods}</strong>
            </li>
            <li>
              <span>Tree density</span>
              <strong>{record.treeDensity.toFixed(1)} trees/ha</strong>
            </li>
            <li>
              <span>Pods per tree</span>
              <strong>{record.podsPerTree.toFixed(1)}</strong>
            </li>
            <li>
              <span>Yield per ha</span>
              <strong>{record.yieldPerHa.toFixed(1)} kg</strong>
            </li>
            <li>
              <span>Estimated volume</span>
              <strong>{record.volume.toFixed(1)} kg</strong>
            </li>
            <li>
              <span>Last year production</span>
              <strong>{record.lastYearProduction.toFixed(1)} kg</strong>
            </li>
          </ul>
        </div>

        <div className="detail-card">
          <h2>Conditions & adjustments</h2>
          <ul>
            <li>
              <span>Adjustment factor</span>
              <strong>{record.adjustmentPercentage.toFixed(1)}%</strong>
            </li>
            <li>
              <span>Challenges noted</span>
              <strong>{activeConditions.length > 0 ? activeConditions.join(', ') : 'None'}</strong>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default RecordDetailPage;
