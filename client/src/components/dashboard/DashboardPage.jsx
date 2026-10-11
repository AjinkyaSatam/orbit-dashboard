import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Thermometer,
  Droplets,
  Radar,
  Flame,
  CloudRain,
  Mic,
  Wind,
  Bell,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  AlertTriangle,
  Check,
  ToggleLeft,
  ToggleRight,
  Radio,
  Sliders,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import useStore from '../../store/useStore';
import { useDemoMode } from '../../hooks/useDemoMode';
import useMqtt from '../../hooks/useMqtt';
import useDirectHttp from '../../hooks/useDirectHttp';
import SensorControls from './SensorControls';
import './Dashboard.css';

const TABS = ['Overview', 'Sensor Controls', 'Charts', 'Alerts'];

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('Overview');
  const {
    readings,
    readingsHistory,
    deviceOnline,
    lastSeen,
    commMode,
    setCommMode,
    esp32HttpUrl,
    httpConnected,
    httpStatus,
    mqttConnected,
    mqttStatus,
    demoMode,
    toggleDemoMode,
    dataSource,
    sensorControls,
    alerts,
    ackAlert,
    addToast,
  } = useStore();

  // Dual Communication Engine: MQTT (Cloud) vs Direct Wi-Fi HTTP (Local)
  const mqttHook = useMqtt();
  const httpHook = useDirectHttp();

  const publishControl = commMode === 'http' ? httpHook.publishControl : mqttHook.publishControl;
  const syncAllControls = commMode === 'http' ? httpHook.syncAllControls : mqttHook.syncAllControls;

  // Start simulated demo mode (if enabled and no real ESP32 streaming)
  useDemoMode();

  const handleBuzzerToggle = () => {
    const nextState = !sensorControls.buzzer;
    publishControl('buzzer', nextState);
    const targetDesc = commMode === 'http' ? `HTTP POST to ${esp32HttpUrl}/api/control` : 'iot-hub/control/buzzer';
    addToast(
      nextState ? `Buzzer siren activated (${targetDesc})` : 'Buzzer siren deactivated',
      nextState ? 'warn' : 'info'
    );
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="headline-small" style={{ marginBottom: '4px' }}>Dashboard</h1>
          <p className="body-default" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Real vs Demo Data Source Indicator */}
            {dataSource === 'esp32' ? (
              <span className="data-source-badge real">
                <Radio size={13} className="icon-pulse" />
                Live ESP32 Hardware Data ({commMode === 'http' ? 'Direct Wi-Fi HTTP' : 'HiveMQ MQTT'})
              </span>
            ) : demoMode ? (
              <span className="data-source-badge demo">
                <ToggleLeft size={13} />
                Simulated Demo Mode (Not Real Device)
              </span>
            ) : (
              <span className="data-source-badge offline">
                <WifiOff size={13} />
                Hardware Offline — Waiting for ESP32
              </span>
            )}
          </p>
        </div>

        <div className="dashboard-controls">
          {/* Mode Selector Pill */}
          <button
            onClick={() => {
              const nextMode = commMode === 'mqtt' ? 'http' : 'mqtt';
              setCommMode(nextMode);
              addToast(
                nextMode === 'http'
                  ? `Direct Wi-Fi HTTP Demo Mode activated (Polling ${esp32HttpUrl})`
                  : 'Cloud MQTT Mode activated (HiveMQ Broker)',
                'info'
              );
            }}
            className={`mode-toggle-btn ${commMode === 'http' ? 'mode-badge-http' : 'mode-badge-mqtt'}`}
            title={`Active: ${commMode === 'http' ? 'Direct Wi-Fi HTTP' : 'Cloud MQTT'}. Click to switch.`}
            aria-label="Toggle communication mode"
          >
            <Radio size={12} className={deviceOnline ? 'icon-pulse' : ''} />
            <span>{commMode === 'http' ? 'Direct Wi-Fi HTTP' : 'MQTT (HiveMQ)'}</span>
          </button>

          {/* Connection Status */}
          <div className="connection-status">
            {commMode === 'http' ? (
              httpConnected ? (
                <span className="status-badge online" title={`Connected directly to ${esp32HttpUrl}`}>
                  <Wifi size={12} /> Wi-Fi HTTP Connected
                </span>
              ) : httpStatus === 'polling' ? (
                <span className="status-badge offline" style={{ color: '#f59e0b' }}>
                  <Wifi size={12} className="icon-pulse" /> Connecting HTTP...
                </span>
              ) : (
                <span className="status-badge offline" title={`Could not reach ${esp32HttpUrl}`}>
                  <WifiOff size={12} /> HTTP Offline
                </span>
              )
            ) : (
              mqttConnected ? (
                <span className="status-badge online" title="Connected to HiveMQ WebSocket">
                  <Wifi size={12} /> HiveMQ Connected
                </span>
              ) : mqttStatus === 'connecting' ? (
                <span className="status-badge offline" style={{ color: '#f59e0b' }}>
                  <Wifi size={12} className="icon-pulse" /> Connecting...
                </span>
              ) : (
                <span className="status-badge offline" title="Disconnected from broker">
                  <WifiOff size={12} /> Disconnected
                </span>
              )
            )}
          </div>

          {/* Demo Toggle */}
          <button
            onClick={toggleDemoMode}
            className="demo-toggle"
            aria-label={`${demoMode ? 'Disable' : 'Enable'} demo mode`}
            title={demoMode ? 'Switch to Live Hardware Mode' : 'Switch to Demo Simulated Mode'}
          >
            {demoMode ? <ToggleRight size={20} color="var(--ok)" /> : <ToggleLeft size={20} />}
            <span className="caption">Demo Mode</span>
          </button>

          {/* Buzzer Quick Button */}
          <button
            onClick={handleBuzzerToggle}
            className={`buzzer-btn ${sensorControls.buzzer ? 'danger-pulse' : ''}`}
            aria-label="Toggle buzzer alarm"
            title={sensorControls.buzzer ? 'Buzzer is ON — Click to silence' : 'Click to trigger buzzer alert'}
          >
            {sensorControls.buzzer ? (
              <Volume2 size={18} color="var(--danger)" />
            ) : (
              <VolumeX size={18} />
            )}
          </button>
        </div>
      </div>

      {/* Emergency Alerts Banners */}
      <AnimatePresence>
        {(readings.flame === 1 || readings.flameDetected) && (
          <motion.div
            className="alert-banner danger"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <AlertTriangle size={16} style={{ marginRight: '8px' }} />
            FIRE DETECTED — Flame infrared sensor triggered. Immediate action required.
          </motion.div>
        )}
        {(readings.gasAlarm || readings.gas > 300) && (
          <motion.div
            className="alert-banner danger"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ marginTop: '8px' }}
          >
            <AlertTriangle size={16} style={{ marginRight: '8px' }} />
            HAZARDOUS GAS DETECTED — {readings.gasAlarm ? 'Gas safety alarm active' : `MQ-135 reading is ${readings.gas} ppm`}. Ventilate area immediately.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'Sensor Controls' && <Sliders size={13} style={{ marginRight: '6px' }} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <OverviewTab
          readings={readings}
          deviceOnline={deviceOnline}
          lastSeen={lastSeen}
          readingsHistory={readingsHistory}
          sensorControls={sensorControls}
        />
      )}

      {activeTab === 'Sensor Controls' && (
        <SensorControls publishControl={publishControl} syncAllControls={syncAllControls} />
      )}

      {activeTab === 'Charts' && (
        <ChartsTab readingsHistory={readingsHistory} />
      )}

      {activeTab === 'Alerts' && (
        <AlertsTab alerts={alerts} ackAlert={ackAlert} />
      )}

      {/* Device Info Footer */}
      <div className="device-info">
        <div className="device-info-row">
          <span className="caption">Hardware Device Status</span>
          <span className="caption" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`status-dot ${deviceOnline ? 'online' : 'offline'}`}></span>
            {deviceOnline ? 'Online (ESP32 Connected)' : 'Offline / Standby'}
          </span>
        </div>
        <div className="device-info-row">
          <span className="caption">Last Telemetry Timestamp</span>
          <span className="caption">{lastSeen ? new Date(lastSeen).toLocaleString() : '—'}</span>
        </div>
        <div className="device-info-row">
          <span className="caption">Active Operating Mode</span>
          <span className="caption">
            {commMode === 'http'
              ? `Direct Wi-Fi HTTP Mode (${esp32HttpUrl})`
              : dataSource === 'esp32'
              ? 'Real ESP32 Hardware Data via HiveMQ'
              : demoMode
              ? 'Simulated Demo Pattern Generator'
              : 'Waiting for Hardware Connection'}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ readings, deviceOnline, lastSeen, readingsHistory, sensorControls }) {
  const cards = [
    {
      label: 'Temperature (DHT11)',
      value: sensorControls?.dht11 !== false ? readings.temp : 'Disabled',
      unit: sensorControls?.dht11 !== false ? '°C' : '',
      icon: Thermometer,
      color: '#ff9f0a',
      chart: readingsHistory.map((r) => r.temp || 0),
      status:
        sensorControls?.dht11 === false
          ? 'disabled'
          : readings.temp > 45
          ? 'danger'
          : readings.temp > 35
          ? 'warn'
          : 'ok',
    },
    {
      label: 'Humidity (DHT11)',
      value: sensorControls?.dht11 !== false ? readings.hum : 'Disabled',
      unit: sensorControls?.dht11 !== false ? '%' : '',
      icon: Droplets,
      color: '#0071e3',
      chart: readingsHistory.map((r) => r.hum || 0),
      status: sensorControls?.dht11 === false ? 'disabled' : readings.hum > 85 ? 'warn' : 'ok',
    },
    {
      label: 'Air Quality (MQ-135)',
      value: sensorControls?.mq135 !== false ? (readings.isRawGas ? readings.gasRaw : readings.gas) : 'Disabled',
      unit: sensorControls?.mq135 !== false ? (readings.isRawGas ? 'ADC' : 'ppm') : '',
      icon: Wind,
      color: '#f59e0b',
      chart: readingsHistory.map((r) => r.gas || r.gasRaw || 0),
      status:
        sensorControls?.mq135 === false
          ? 'disabled'
          : (readings.gasAlarm || readings.gas > 300)
          ? 'danger'
          : readings.gas > 180
          ? 'warn'
          : 'ok',
      subtitle: sensorControls?.mq135 !== false ? (readings.gasAlarm ? '⚠️ Gas Alarm Triggered' : `Raw ADC: ${readings.gasRaw || 0}`) : 'Sensor switch OFF',
    },
    {
      label: 'Flame Sensor',
      value:
        sensorControls?.flame === false && !sensorControls?.safetyOverride
          ? 'Disabled'
          : (readings.flame || readings.flameDetected)
          ? 'FIRE'
          : 'Safe',
      unit: '',
      icon: Flame,
      color: (readings.flame || readings.flameDetected) ? '#ff3b30' : '#34c759',
      status: (readings.flame || readings.flameDetected) ? 'danger' : 'ok',
      subtitle: (readings.flame || readings.flameDetected) ? 'Infrared Flame Detected!' : `Raw ADC: ${readings.flameRaw || 0}`,
    },
    {
      label: 'Rain Sensor',
      value: sensorControls?.rain !== false ? (readings.rain ? 'Wet' : 'Dry') : 'Disabled',
      unit: '',
      icon: CloudRain,
      color: readings.rain ? '#0071e3' : '#34c759',
      status: sensorControls?.rain === false ? 'disabled' : readings.rain ? 'warn' : 'ok',
      subtitle: `Raw ADC: ${readings.rainRaw || 0}`,
    },
    {
      label: 'Sound Sensor',
      value:
        sensorControls?.sound !== false
          ? typeof readings.sound === 'number' && readings.sound > 1
            ? readings.sound
            : readings.soundDetected
            ? 'Detected'
            : 'Quiet'
          : 'Disabled',
      unit: typeof readings.sound === 'number' && readings.sound > 1 ? '' : '',
      icon: Mic,
      color: '#bf5af2',
      chart: readingsHistory.map((r) => (typeof r.sound === 'number' ? r.sound : (r.soundDetected ? 1 : 0))),
      status:
        sensorControls?.sound === false
          ? 'disabled'
          : (readings.soundDetected || readings.sound > 700)
          ? 'warn'
          : 'ok',
      subtitle: readings.soundDetected ? 'Acoustic Signal Active' : 'Normal / Ambient',
    },
    {
      label: 'PIR Motion Sensor',
      value:
        sensorControls?.motion !== false
          ? (readings.motion || readings.motionDetected ? 'Detected' : 'Clear')
          : 'Disabled',
      unit: '',
      icon: Radar,
      color: (readings.motion || readings.motionDetected) ? '#0071e3' : '#6e6e73',
      status:
        sensorControls?.motion === false
          ? 'disabled'
          : (readings.motion || readings.motionDetected)
          ? 'active'
          : 'ok',
      subtitle: (readings.motion || readings.motionDetected) ? 'Motion Detected' : 'Clear / No Movement',
    },
  ];

  return (
    <div className="overview-grid">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          className={`data-card ${card.status === 'danger' ? 'danger-pulse' : ''} ${
            card.status === 'disabled' ? 'disabled-card' : ''
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="data-card-header">
            <span className="data-label">{card.label}</span>
            <card.icon size={20} strokeWidth={1.5} style={{ color: card.color }} />
          </div>
          <div
            className="data-value"
            style={{
              color: card.status === 'danger' ? 'var(--danger)' : card.status === 'disabled' ? 'var(--muted)' : undefined,
              fontSize: card.status === 'disabled' ? '22px' : undefined,
            }}
          >
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
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ marginTop: 8, opacity: 0.6 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Charts Tab ─── */
function ChartsTab({ readingsHistory = [] }) {
  const chartData = (readingsHistory || []).map((r, i) => {
    const raw = r.ts || 0;
    const ms = raw > 1e11 ? raw : raw * 1000;
    return {
      ...r,
      index: i,
      time: ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--',
    };
  });

  const charts = [
    { key: 'temp', name: 'Temperature (°C)', color: '#ff9f0a' },
    { key: 'hum', name: 'Humidity (%)', color: '#0071e3' },
    { key: 'gas', name: 'MQ-135 Gas / Air Quality (ppm)', color: '#f59e0b' },
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
