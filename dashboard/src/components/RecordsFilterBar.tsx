import { useEffect, useState } from 'react';

export interface RecordsFilterState {
  search?: string;
  farmerId?: string;
  officer?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export interface RecordsFilterBarProps {
  filters: RecordsFilterState;
  onApply: (filters: RecordsFilterState) => void;
  onReset: () => void;
  onExport?: (format: 'csv' | 'xlsx') => void;
  showExportButtons?: boolean;
}

export function RecordsFilterBar({ filters, onApply, onReset, onExport, showExportButtons = true }: RecordsFilterBarProps) {
  const [localFilters, setLocalFilters] = useState<RecordsFilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const updateField = (field: keyof RecordsFilterState, value: string) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onApply(localFilters);
  };

  return (
    <form className="filter-bar" onSubmit={handleSubmit}>
      <div className="filter-bar__fields">
        <label>
          Search
          <input
            type="text"
            value={localFilters.search ?? ''}
            onChange={(event) => updateField('search', event.target.value)}
            placeholder="Farmer, officer or location"
          />
        </label>
        <label>
          Farmer ID
          <input
            type="text"
            value={localFilters.farmerId ?? ''}
            onChange={(event) => updateField('farmerId', event.target.value)}
          />
        </label>
        <label>
          Officer
          <input
            type="text"
            value={localFilters.officer ?? ''}
            onChange={(event) => updateField('officer', event.target.value)}
          />
        </label>
        <label>
          Location
          <input
            type="text"
            value={localFilters.location ?? ''}
            onChange={(event) => updateField('location', event.target.value)}
          />
        </label>
        <label>
          Start Date
          <input
            type="date"
            value={localFilters.startDate ?? ''}
            onChange={(event) => updateField('startDate', event.target.value)}
          />
        </label>
        <label>
          End Date
          <input
            type="date"
            value={localFilters.endDate ?? ''}
            onChange={(event) => updateField('endDate', event.target.value)}
          />
        </label>
      </div>
      <div className="filter-bar__actions">
        <button type="submit" className="btn btn--primary">
          Apply filters
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setLocalFilters({});
            onReset();
          }}
        >
          Reset
        </button>
        {showExportButtons && onExport && (
          <div className="filter-bar__exports">
            <button type="button" className="btn" onClick={() => onExport('csv')}>
              Export CSV
            </button>
            <button type="button" className="btn" onClick={() => onExport('xlsx')}>
              Export Excel
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

export default RecordsFilterBar;
