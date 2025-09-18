interface KpiCardProps {
  label: string;
  value: string | number;
  description?: string;
}

export function KpiCard({ label, value, description }: KpiCardProps) {
  return (
    <div className="kpi-card">
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
      {description && <p className="kpi-card__description">{description}</p>}
    </div>
  );
}

export default KpiCard;
