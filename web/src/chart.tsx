import { createRoot } from "react-dom/client";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// What the model asks for: chart type plus column names from the last query result.
// series (optional) is a column whose values each get their own line or bar group, with a legend.
export type ChartSpec = { type: "bar" | "line"; x: string; y: string; series?: string; title?: string };

type Row = Record<string, unknown>;

// First colour is the F1 red used by single-series charts; the rest are for extra series.
const COLORS = ["#e10600", "#1f77b4", "#2ca02c", "#ff7f0e", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f"];

// One output object per x value. Without a series, that is each row with y as a number.
// With a series, each series value becomes a key holding y, so a line or bar group can read it.
export function pivot(rows: Row[], spec: ChartSpec): { data: Row[]; keys: string[] } {
  if (!spec.series) return { data: rows.map((r) => ({ ...r, [spec.y]: Number(r[spec.y]) })), keys: [spec.y] };
  const series = spec.series;
  const keys = [...new Set(rows.map((r) => String(r[series])))];
  const byX = new Map<unknown, Row>();
  for (const r of rows) {
    const point = byX.get(r[spec.x]) ?? { [spec.x]: r[spec.x] };
    point[String(r[series])] = Number(r[spec.y]);
    byX.set(r[spec.x], point);
  }
  return { data: [...byX.values()], keys };
}

function Chart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const { data, keys } = pivot(rows, spec);
  const height = 320;
  const margin = { top: 8, right: 16, bottom: 20, left: 8 };
  // Column names as labels; a short unit when the column is in seconds (e.g. lap_s).
  const yText = /(^|_)s$/.test(spec.y) ? `${spec.y} (s)` : spec.y;
  const yLabel = { value: yText, angle: -90, position: "insideLeft", offset: 10, style: { textAnchor: "middle" } } as const;
  return (
    <div style={{ width: "100%", height, margin: "12px 0" }}>
      {spec.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{spec.title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        {spec.type === "line" ? (
          <LineChart data={data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.x} label={{ value: spec.x, position: "insideBottom", offset: -4 }} />
            <YAxis domain={["auto", "auto"]} label={yLabel} />
            <Tooltip />
            {spec.series && <Legend verticalAlign="top" />}
            {keys.map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} name={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.x} label={{ value: spec.x, position: "insideBottom", offset: -4 }} />
            <YAxis label={yLabel} />
            <Tooltip />
            {spec.series && <Legend verticalAlign="top" />}
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} name={k} fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// Mounts a chart into a plain DOM element; the rest of the app is not React.
export function mountChart(el: HTMLElement, spec: ChartSpec, rows: Row[]): void {
  createRoot(el).render(<Chart spec={spec} rows={rows} />);
}
