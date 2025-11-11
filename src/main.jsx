import React from "react";
import { createRoot } from "react-dom/client";
import KPI from "./components/KPI";
import { callFn } from "./api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";

// Async helper
function useAsync(d = null) {
  const [data, setData] = React.useState(d);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState(null);
  return {
    data,
    loading,
    err,
    async run(p) {
      try {
        setLoading(true);
        setErr(null);
        setData(await p);
      } catch (e) {
        setErr(e.message || String(e));
      } finally {
        setLoading(false);
      }
    },
  };
}

const App = () => {
  const n = 24;
  const [load, setLoad] = React.useState(
    Array.from({ length: n }, (_, i) => 60 + 15 * Math.max(0, Math.sin((i - 18) / 24 * Math.PI * 2)))
  );
  const [solar, setSolar] = React.useState(
    Array.from({ length: n }, (_, i) => 30 * Math.max(0, Math.sin((i - 6) / 24 * Math.PI * 2)))
  );
  const [wind, setWind] = React.useState(
    Array.from({ length: n }, (_, i) => 12 + 8 * Math.max(0, Math.sin(i / 24 * Math.PI * 2)))
  );
  const [prices, setPrices] = React.useState(
    Array.from({ length: n }, (_, i) => 0.08 + 0.16 * Math.max(0, Math.sin((i - 18) / 24 * Math.PI * 2)))
  );

  const [capacity, setCapacity] = React.useState(200);
  const [soc0, setSoc0] = React.useState(0.5);
  const [maxKW, setMaxKW] = React.useState(75);

  const sim = useAsync(),
    sched = useAsync(),
    contrib = useAsync();

  // Apply preset pattern
  const applyPreset = (type, setter) => {
    const n = 24;
    let vals = [];
    switch (type) {
      case "flat":
        vals = Array(n).fill(50);
        break;
      case "peak":
        vals = Array.from({ length: n }, (_, i) => (i >= 8 && i <= 18 ? 80 : 30));
        break;
      case "random":
        vals = Array.from({ length: n }, () => Math.round(Math.random() * 100));
        break;
      default:
        vals = Array(n).fill(0);
    }
    setter(vals);
  };

  // Parse textarea input
  const parseArray = (val, setter) => {
    const arr = val
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((x) => !Number.isNaN(x));
    setter(arr.length ? arr : [0]);
  };

  return (
    <div className="wrap fade-in">

      {/* ✅ Back to Home Button */}
      <div className="btn-back-container">
        <a href="https://energy-verse-portal.netlify.app/?feature=9" className="btn-back-scroll">
          ← Back to Home
        </a>
      </div>

      {/* Header */}
      <div className="title">
        <div>
          <h1>DER Microgrid — Dashboard</h1>
          <div className="sub">Smart Dispatch, Schedule Optimization & Energy Mix</div>
        </div>
        <div className="toolbar">
          <button
            onClick={() =>
              sim.run(
                callFn("der_microgrid_sim", {
                  load,
                  solar,
                  wind,
                  battery: { capacity_kWh: capacity, soc0, maxKW },
                  prices,
                })
              )
            }
          >
            Run Simulation
          </button>
          <button
            onClick={() =>
              sched.run(
                callFn("der_schedule_opt", {
                  load,
                  prices,
                  battery: { capacity_kWh: capacity - 50, soc0: 0.4, maxKW: maxKW - 15 },
                })
              )
            }
          >
            Optimize Schedule
          </button>
          <button
            onClick={() =>
              contrib.run(
                callFn("der_component_contrib", {
                  load,
                  solar,
                  wind,
                  battery: { capacity_kWh: capacity - 50, soc0: 0.4, maxKW: maxKW - 15 },
                })
              )
            }
          >
            Breakdown
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <KPI label="Capacity (kWh)" value={capacity} />
        <KPI label="Max kW" value={maxKW} />
        <KPI label="Initial SoC" value={(soc0 * 100).toFixed(0) + "%"} />
        <KPI label="Editable Inputs" value="Yes" hint="Modify below" />
      </div>

      {/* Main Grid */}
      <div className="grid" style={{ marginTop: 16 }}>
        {/* Left Column */}
        <div className="leftcol">
          <div className="card">
            <h3>Battery Parameters</h3>
            <div className="form-row">
              <div className="label">Capacity (kWh)</div>
              <input type="number" value={capacity} onChange={(e) => setCapacity(+e.target.value)} />
            </div>
            <div className="form-row">
              <div className="label">Max kW</div>
              <input type="number" value={maxKW} onChange={(e) => setMaxKW(+e.target.value)} />
            </div>
            <div className="form-row">
              <div className="label">Initial SoC (0–1)</div>
              <input type="number" step="0.01" value={soc0} onChange={(e) => setSoc0(+e.target.value)} />
            </div>
          </div>

          <div className="card">
            <h3>Profiles Input (24 hours)</h3>

            {[{ key: "Load", arr: load, set: setLoad },
              { key: "Solar", arr: solar, set: setSolar },
              { key: "Wind", arr: wind, set: setWind },
              { key: "Price", arr: prices, set: setPrices },
            ].map(({ key, arr, set }) => (
              <details key={key} open style={{ marginBottom: "10px" }}>
                <summary style={{ color: "var(--accent)", cursor: "pointer" }}>{key} Profile</summary>
                <div className="form-row">
                  <div className="label">Preset Pattern</div>
                  <select onChange={(e) => applyPreset(e.target.value, set)}>
                    <option value="">Select...</option>
                    <option value="flat">Flat</option>
                    <option value="peak">Daytime Peak</option>
                    <option value="random">Random</option>
                  </select>
                </div>
                <textarea
                  rows="3"
                  value={arr.join(", ")}
                  onChange={(e) => parseArray(e.target.value, set)}
                  style={{ width: "100%", resize: "vertical", marginTop: "6px" }}
                />
              </details>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="rightcol">
          <div className="card col-span-12">
            <h3>Dispatch (SoC / Charge / Discharge)</h3>
            {sim.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={sim.data.dispatch}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line dataKey="soc" stroke="#caff37" />
                  <Line dataKey="charge" stroke="#9aff65" />
                  <Line dataKey="discharge" stroke="#66ff88" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="muted">Run simulation.</div>
            )}
            {sim.data && (
              <div className="muted" style={{ marginTop: 8 }}>
                Cost: ₹{sim.data.energy_balance_cost} | Unmet: {sim.data.unmet_load_kWh} kWh | Curtail: {sim.data.curtailment_kWh} kWh
              </div>
            )}
          </div>

          <div className="card col-span-6">
            <h3>Optimal Schedule</h3>
            {sched.data ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={sched.data.plan}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="amount" fill="#caff37" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="muted">Optimize schedule.</div>
            )}
          </div>

          <div className="card col-span-6">
            <h3>Component Contribution</h3>
            {contrib.data ? (
              <table>
                <tbody>
                  <tr><td>Solar</td><td>{contrib.data.contribution.solar_kWh}</td></tr>
                  <tr><td>Wind</td><td>{contrib.data.contribution.wind_kWh}</td></tr>
                  <tr><td>Battery</td><td>{contrib.data.contribution.battery_kWh}</td></tr>
                  <tr><td>Grid</td><td>{contrib.data.contribution.grid_kWh}</td></tr>
                </tbody>
              </table>
            ) : (
              <div className="muted">Run Breakdown.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

createRoot(document.getElementById("root")).render(<App />);
