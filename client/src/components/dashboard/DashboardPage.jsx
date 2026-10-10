import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer, Droplets, Eye, Flame, CloudRain, Mic,
  Bell, Volume2, VolumeX, Activity, Wifi, WifiOff,
  ChevronRight, AlertTriangle, Check, ToggleLeft, ToggleRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import useStore from '../../store/useStore';
import { useDemoMode } from '../../hooks/useDemoMode';
import './Dashboard.css';

const TABS = ['Overview', 'Charts', 'Alerts'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const {
    readings, readingsHistory, deviceOnline, lastSeen,
    mqttConnected, demoMode, toggleDemoMode,
    alerts, ackAlert, addToast
  } = useStore();
  const [buzzerOn, setBuzzerOn] = useState(false);

  // Start demo mode
  useDemoMode();

  const handleBuzzer = () => {
    setBuzzerOn(!buzzerOn);
    addToast(buzzerOn ? 'Buzzer turned off' : 'Buzzer activated', 'info');
    // In production: publish to iot/safetybox/TEAMID/cmd
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="headline-small" style={{ marginBottom: '4px' }}>Dashboard</h1>
          <p className="body-default">
            {demoMode ? 'Demo Mode — Simulated data' : 'Live sensor readings'}
          </p>
        </div>
        <div className="dashboard-controls">
          <div className="connection-status">
            {mqttConnected ? (
              <span className="status-badge online"><Wifi size={12} /> Connected</span>
            ) : (
              <span className="status-badge offline"><WifiOff size={12} /> Disconnected</span>
            )}
          </div>
          <button
            onClick={toggleDemoMode}
            className="demo-toggle"
            aria-label={`${demoMode ? 'Disable' : 'Enable'} demo mode`}
          >
            {demoMode ? <ToggleRight size={20} color="var(--ok)" /> : <ToggleLeft size={20} />}
            <span className="caption">Demo</span>
          </button>
          <button onClick={handleBuzzer} className="buzzer-btn" aria-label="Toggle buzzer">
            {buzzerOn ? <Volume2 size={18} color="var(--danger)" /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      <AnimatePresence>
        {readings.flame === 1 && (
          <motion.div
            className="alert-banner danger"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <AlertTriangle size={16} style={{ marginRight: '8px' }} />
            🔥 FIRE DETECTED — Flame sensor triggered. Check immediately.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <OverviewTab readings={readings} deviceOnline={deviceOnline} lastSeen={lastSeen} readingsHistory={readingsHistory} />
      )}
      {activeTab === 'Charts' && (
        <ChartsTab readingsHistory={readingsHistory} />
      )}
      {activeTab === 'Alerts' && (
        <AlertsTab alerts={alerts} ackAlert={ackAlert} />
      )}

      {/* Device info */}
      <div className="device-info">
        <div className="device-info-row">
          <span className="caption">Device Status</span>
          <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-dot ${deviceOnline ? 'online' : 'offline'}`}></span>
            {deviceOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="device-info-row">
          <span className="caption">Last Seen</span>
          <span className="caption">{lastSeen ? new Date(lastSeen).toLocaleString() : '—'}</span>
        </div>
        <div className="device-info-row">
          <span className="caption">Mode</span>
          <span className="caption">{demoMode ? 'Demo (Simulated)' : 'Live (MQTT)'}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ readings, deviceOnline, lastSeen, readingsHistory }) {
  const cards = [
    {
      label: 'Temperature',
      value: readings.temp,
      unit: '°C',
      icon: Thermometer,
      color: '#ff9f0a',
      chart: readingsHistory.map(r => r.temp),
      status: readings.temp > 45 ? 'danger' : readings.temp > 35 ? 'warn' : 'ok',
    },
    {
      label: 'Humidity',
      value: readings.hum,
      unit: '%',
      icon: Droplets,
      color: '#0071e3',
      chart: readingsHistory.map(r => r.hum),
      status: readings.hum > 85 ? 'warn' : 'ok',
    },
    {
      label: 'Flame',
      value: readings.flame ? 'FIRE' : 'Safe',
      unit: '',
      icon: Flame,
      color: readings.flame ? '#ff3b30' : '#34c759',
      status: readings.flame ? 'danger' : 'ok',
      subtitle: `Raw: ${readings.flameRaw}`,
    },
    {
      label: 'Rain',
      value: readings.rain ? 'Wet' : 'Dry',
      unit: '',
      icon: CloudRain,
      color: readings.rain ? '#0071e3' : '#34c759',
      status: readings.rain ? 'warn' : 'ok',
      subtitle: `Raw: ${readings.rainRaw}`,
    },
    {
      label: 'Sound',
      value: readings.sound,
      unit: '',
      icon: Mic,
      color: '#bf5af2',
      chart: readingsHistory.map(r => r.sound),
      status: readings.sound > 700 ? 'warn' : 'ok',
    },
    {
      label: 'Motion',
      value: readings.motion ? 'Detected' : 'Clear',
      unit: '',
      icon: Eye,
      color: readings.motion ? '#0071e3' : '#6e6e73',
      status: readings.motion ? 'active' : 'ok',
    },
  ];

  return (
    <div className="overview-grid">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          className={`data-card ${card.status === 'danger' ? 'danger-pulse' : ''}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="data-card-header">
            <span className="data-label">{card.label}</span>
            <card.icon size={20} strokeWidth={1.5} style={{ color: card.color }} />
          </div>
          <div className="data-value" style={{ color: card.status === 'danger' ? 'var(--danger)' : undefined }}>
            {card.value}
            {card.unit && <span className="data-unit">{card.unit}</span>}
          </div>
          {card.subtitle && <span className="caption">{card.subtitle}</span>}
          {card.chart && <MiniSparkline data={card.chart} color={card.color} />}
          <div className="data-card-status">
            <span className={`status-indicator ${card.status}`}></span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return <div style={{ height: 40 }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 200;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 8, opacity: 0.6 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Charts Tab ─── */
function ChartsTab({ readingsHistory }) {
  const chartData = readingsHistory.map((r, i) => ({
    ...r,
    index: i,
    time: new Date(r.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  }));

  const charts = [
    { key: 'temp', name: 'Temperature (°C)', color: '#ff9f0a' },
    { key: 'hum', name: 'Humidity (%)', color: '#0071e3' },
    { key: 'sound', name: 'Sound Level', color: '#bf5af2' },
  ];

  return (
    <div className="charts-grid">
      {charts.map((chart) => (
        <div className="chart-card" key={chart.key}>
          <h3 className="chart-title">{chart.name}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted)' }} tickLine={false} axisLine={false} width={40} />
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
                dataKey={chart.key}
                stroke={chart.color}
                strokeWidth={2}
                dot={false}
                animationDuration={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}
    </div>
  );
}

/* ─── Alerts Tab ─── */
function AlertsTab({ alerts, ackAlert }) {
  if (alerts.length === 0) {
    return (
      <div className="alerts-empty">
        <Bell size={40} strokeWidth={1} style={{ color: 'var(--muted)', marginBottom: '16px' }} />
        <p className="body-large">No alerts yet.</p>
        <p className="body-default">Alerts will appear here when sensor thresholds are crossed.</p>
      </div>
    );
  }

  return (
    <div className="alerts-list">
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          className={`alert-item ${alert.type} ${alert.acked ? 'acked' : ''}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          layout
        >
          <div className="alert-item-content">
            <span className="alert-item-msg">{alert.message}</span>
            <span className="caption">{new Date(alert.ts).toLocaleString()}</span>
          </div>
          {!alert.acked && (
            <button className="alert-ack-btn" onClick={() => ackAlert(alert.id)} aria-label="Acknowledge alert">
              <Check size={14} /> Ack
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
