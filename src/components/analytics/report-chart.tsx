"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RenderedReport } from "@/lib/research/reports";

const PALETTE = [
  "#3a7d44",
  "#4ea76a",
  "#9ec9a6",
  "#d6a86e",
  "#c47452",
  "#7a6cb1",
  "#5b8db8",
  "#a3a3a3",
];

interface Props {
  report: RenderedReport;
}

export function ReportChart({ report }: Props) {
  const { spec, rows } = report;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-text-muted text-center py-12">
        No data for this combination of dimension + metric.
      </p>
    );
  }

  if (spec.kind === "pie") {
    return (
      <div className="w-full h-80">
        <ResponsiveContainer>
          <PieChart>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={50}
              outerRadius={100}
              paddingAngle={2}
            >
              {rows.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.kind === "line" || spec.kind === "projection") {
    return (
      <div className="w-full h-80">
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={PALETTE[0]}
              strokeWidth={2}
              dot={(props) => {
                const cx = props.cx as number | undefined;
                const cy = props.cy as number | undefined;
                if (cx === undefined || cy === undefined) {
                  return <g />;
                }
                const forecast = (props.payload as { forecast?: boolean }).forecast;
                return (
                  <circle
                    key={String(props.key ?? `${cx}-${cy}`)}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={forecast ? "#ffffff" : PALETTE[0]}
                    stroke={PALETTE[0]}
                    strokeWidth={forecast ? 2 : 1}
                  />
                );
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // bar + pivot fall through to bar
  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(0,0,0,0.08)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-15} height={50} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {rows.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
