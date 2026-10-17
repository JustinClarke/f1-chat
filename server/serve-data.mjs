// Read-only static server for the Parquet data: CORS + HTTP Range support.
// Also serves /manifest.json: the 2024 laps/results files (DuckDB-WASM cannot glob over HTTP).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.DATA_ROOT || "/Users/justin/github/off-the-pace/data");
const PORT = Number(process.env.PORT || 8000);
const SEASON = "2024";
const DATASETS = ["laps", "results"];
// Built in off-the-pace (dbt model dim_driver_seasons), exported to parquet. Keyed by season and driver code.
const REFERENCE = { driver_seasons: "bronze/reference/drivers/driver_seasons.parquet" };

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".parquet") ? [path.join(d, e.name)] : []);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
};

http.createServer((req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/manifest.json") {
    const m = Object.fromEntries(DATASETS.map((d) =>
      [d, walk(path.join(ROOT, "bronze", d, `season=${SEASON}`)).map((f) => path.relative(ROOT, f).split(path.sep).join("/"))]));
    // Reference tables are single files covering all seasons (e.g. driver names by season).
    for (const [name, rel] of Object.entries(REFERENCE)) m[name] = [rel];
    return res.writeHead(200, { ...cors, "Content-Type": "application/json" }).end(JSON.stringify(m));
  }
  const file = path.join(ROOT, decodeURIComponent(url.pathname));
  // stay inside ROOT, parquet only, and never touch the .duckdb files or telemetry
  if (!file.startsWith(ROOT + path.sep) || !file.endsWith(".parquet") || file.includes(`${path.sep}telemetry${path.sep}`))
    return res.writeHead(403, cors).end("forbidden");
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return res.writeHead(404, cors).end("not found");
    const base = { ...cors, "Accept-Ranges": "bytes", "Content-Type": "application/octet-stream" };
    const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (!m) {
      res.writeHead(200, { ...base, "Content-Length": st.size });
      return req.method === "HEAD" ? res.end() : fs.createReadStream(file).pipe(res);
    }
    const start = m[1] ? Number(m[1]) : Math.max(0, st.size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), st.size - 1) : st.size - 1;
    if (start > end || start >= st.size) return res.writeHead(416, { ...base, "Content-Range": `bytes */${st.size}` }).end();
    res.writeHead(206, { ...base, "Content-Range": `bytes ${start}-${end}/${st.size}`, "Content-Length": end - start + 1 });
    req.method === "HEAD" ? res.end() : fs.createReadStream(file, { start, end }).pipe(res);
  });
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
