import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface SeriesPoint {
  month: string;
  totalVolume: number;
}

export interface TrendChartProps {
  title: string;
  series: Record<string, SeriesPoint[]>;
}

const palette = ['#8A3E2F', '#1D8A3F', '#F6B26B', '#3870FF', '#8E7CC3', '#CC4125'];

export function TrendChart({ title, series }: TrendChartProps) {
  const seriesKeys = Object.keys(series);
  const monthSet = new Set<string>();
  seriesKeys.forEach((key) => {
    series[key].forEach((point) => monthSet.add(point.month));
  });
  const months = Array.from(monthSet).sort((a, b) => a.localeCompare(b));

  const data = months.map((month) => {
    const entry: Record<string, string | number> = { month };
    seriesKeys.forEach((key) => {
      const value = series[key].find((point) => point.month === month)?.totalVolume ?? 0;
      entry[key] = Number(value.toFixed(2));
    });
    return entry;
  });

  if (months.length === 0) {
    return (
      <div className="chart-empty">
        <h3>{title}</h3>
        <p>No data available for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          {seriesKeys.map((key, index) => (
            <Line key={key} type="monotone" dataKey={key} stroke={palette[index % palette.length]} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default TrendChart;
