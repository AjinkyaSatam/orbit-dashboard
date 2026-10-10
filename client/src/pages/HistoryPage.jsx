import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import useStore from '../store/useStore';
import './History.css';

const SENSORS = [
  { key: 'temp', label: 'Temperature', color: '#ff9f0a', unit: '°C' },
  { key: 'hum', label: 'Humidity', color: '#0071e3', unit: '%' },
  { key: 'sound', label: 'Sound', color: '#bf5af2', unit: '' },
  { key: 'flameRaw', label: 'Flame (Raw)', color: '#ff3b30', unit: '' },
  { key: 'rainRaw', label: 'Rain (Raw)', color: '#30d158', unit: '' },
];

const PAGE_SIZE = 20;

export default function HistoryPage() {
  const { readingsHistory } = useStore();
  const [selectedSensor, setSelectedSensor] = useState('temp');
  const [page, setPage] = useState(0);

  const sensor = SENSORS.find((s) => s.key === selectedSensor);

  const chartData = useMemo(() =>
    readingsHistory.map((r, i) => ({
      ...r,
      time: new Date(r.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      index: i,
    })),
    [readingsHistory]
  );

  const tableData = useMemo(() => {
    const reversed = [...readingsHistory].reverse();
    const start = page * PAGE_SIZE;
    return reversed.slice(start, start + PAGE_SIZE);
  }, [readingsHistory, page]);

  const totalPages = Math.max(1, Math.ceil(readingsHistory.length / PAGE_SIZE));

  const exportCSV = () => {
    const headers = 'Timestamp,Temperature,Humidity,Flame,FlameRaw,Rain,RainRaw,Sound,Motion\n';
    const rows = readingsHistory.map((r) =>
      `${new Date(r.ts * 1000).toISOString()},${r.temp},${r.hum},${r.flame},${r.flameRaw},${r.rain},${r.rainRaw},${r.sound},${r.motion}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h1 className="headline-small" style={{ marginBottom: '4px' }}>History</h1>
          <p className="body-default">{readingsHistory.length} data points collected</p>
        </div>
        <div className="history-actions">
          <button className="btn-primary" onClick={exportCSV} style={{ fontSize: '14px', padding: '8px 20px' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Sensor Filter */}
      <div className="sensor-filter">
        {SENSORS.map((s) => (
          <button
            key={s.key}
            className={`sensor-filter-btn ${selectedSensor === s.key ? 'active' : ''}`}
            onClick={() => setSelectedSensor(s.key)}
            style={selectedSensor === s.key ? { borderColor: s.color, color: s.color } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <motion.div
        className="history-chart-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={selectedSensor}
      >
        <h3 className="chart-title">{sensor.label} {sensor.unit && `(${sensor.unit})`}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="var(--nav-border)" strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={45} />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '13px',
                color: 'var(--text)',
              }}
            />
            <Line
              type="monotone"
              dataKey={selectedSensor}
              stroke={sensor.color}
              strokeWidth={2}
              dot={false}
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Data Table */}
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Temp °C</th>
              <th>Humidity %</th>
              <th>Flame</th>
              <th>Rain</th>
              <th>Sound</th>
              <th>Motion</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>No data yet. Enable Demo Mode on the dashboard.</td></tr>
            ) : (
              tableData.map((r, i) => (
                <tr key={i}>
                  <td>{new Date(r.ts * 1000).toLocaleTimeString()}</td>
                  <td>{r.temp}</td>
                  <td>{r.hum}</td>
                  <td style={{ color: r.flame ? 'var(--danger)' : 'var(--ok)' }}>{r.flame ? 'Yes' : 'No'}</td>
                  <td style={{ color: r.rain ? 'var(--accent)' : 'var(--ok)' }}>{r.rain ? 'Yes' : 'No'}</td>
                  <td>{r.sound}</td>
                  <td>{r.motion ? 'Yes' : 'No'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {readingsHistory.length > PAGE_SIZE && (
        <div className="history-pagination">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="page-btn"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="caption">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="page-btn"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
