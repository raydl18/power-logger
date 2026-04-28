"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  week: number;
  weight: number;
}

interface LiftSeries {
  name: string;
  color: string;
  data: DataPoint[];
}

interface Props {
  series: LiftSeries[];
}

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-border rounded p-2 text-xs font-mono">
      <p className="text-muted mb-1">Week {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}lb
        </p>
      ))}
    </div>
  );
};

export default function ProgressChart({ series }: Props) {
  if (series.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted text-sm">
        no data yet — start logging!
      </div>
    );
  }

  // Merge all data points into a single array keyed by week
  const weeks = Array.from(
    new Set(series.flatMap((s) => s.data.map((d) => d.week)))
  ).sort((a, b) => a - b);

  const chartData = weeks.map((week) => {
    const point: Record<string, number> = { week };
    series.forEach((s) => {
      const match = s.data.find((d) => d.week === week);
      if (match) point[s.name] = match.weight;
    });
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis
          dataKey="week"
          tickFormatter={(v) => `W${v}`}
          stroke="#666"
          tick={{ fontFamily: "Courier New", fontSize: 11, fill: "#666" }}
        />
        <YAxis
          stroke="#666"
          tick={{ fontFamily: "Courier New", fontSize: 11, fill: "#666" }}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CUSTOM_TOOLTIP />} />
        <Legend
          wrapperStyle={{ fontFamily: "Courier New", fontSize: 11, paddingTop: 8 }}
        />
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={{ r: 4, fill: s.color }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
