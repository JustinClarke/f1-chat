import { createRoot } from "react-dom/client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

// What the model asks for: chart type plus column names from the last query result.
export type ChartSpec = { type: "bar" | "line"; x: string; y: string; title?: string };

type Row = Record<string, unknown>;

function Chart({ spec, rows }: { spec: ChartSpec; rows: Row[] }) {
  const data = rows.map((r) => ({ ...r, [spec.y]: Number(r[spec.y]) }));
  const height = 320;
  return (
    <div style={{ width: "100%", height, margin: "12px 0" }}>
      {spec.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{spec.title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        {spec.type === "line" ? (
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.x} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={spec.y} stroke="#e10600" />
          </LineChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={spec.x} />
            <YAxis />
            <Tooltip />
            <Bar dataKey={spec.y} fill="#e10600" />
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
