import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wind,
  Flame,
  CloudRain,
  Mic,
  Radar,
  Thermometer,
  Volume2,
  VolumeX,
  Lightbulb,
  Shield,
  ShieldAlert,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import useStore from '../../store/useStore';
import { TOPIC_MAP } from '../../hooks/useMqtt';

export default function SensorControls({ publishControl, syncAllControls }) {
  const {
    sensorControls,
    setSensorControl,
    readings,
    deviceOnline,
    dataSource,
    mqttConnected,
    mqttStatus,
    mqttBrokerUrl,
    setMqttBrokerUrl,
    mqttTopicPrefix,
    setMqttTopicPrefix,
    addToast,
  } = useStore();

  const [showConfig, setShowConfig] = useState(false);
  const [brokerInput, setBrokerInput] = useState(mqttBrokerUrl);
  const [prefixInput, setPrefixInput] = useState(mqttTopicPrefix);

  const handleToggle = (key) => {
    const nextVal = !sensorControls[key];
    if (publishControl) {
      publishControl(key, nextVal);
    } else {
      setSensorControl(key, nextVal);
    }
    addToast(
      `${key.toUpperCase()} set to ${nextVal ? 'ON' : 'OFF'} (Published to ${mqttTopicPrefix}/control/${TOPIC_MAP[key] || key})`,
      'info'
    );
  };

  const handleSafetyToggle = () => {
    const nextVal = !sensorControls.safetyOverride;
    setSensorControl('safetyOverride', nextVal);
    addToast(
      `Safety Override ${nextVal ? 'ACTIVATED: Gas & Flame alerts armed regardless of sensor switches' : 'DEACTIVATED'}`,
      nextVal ? 'success' : 'warn'
    );
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setMqttBrokerUrl(brokerInput.trim());
    setMqttTopicPrefix(prefixInput.trim());
    setShowConfig(false);
    addToast('MQTT Configuration updated. Reloading connection...', 'success');
    window.location.reload();
  };

  const handleResetConfig = () => {
    const defaultUrl = 'wss://broker.hivemq.com:8884/mqtt';
    const defaultPrefix = 'iot-hub';
    setBrokerInput(defaultUrl);
    setPrefixInput(defaultPrefix);
    setMqttBrokerUrl(defaultUrl);
    setMqttTopicPrefix(defaultPrefix);
    setShowConfig(false);
    addToast('MQTT Settings reset to defaults', 'info');
  };

  // Sensor definitions with icons, descriptions, and dynamic readings
  const SENSORS = [
    {
      id: 'mq135',
      name: 'MQ-135 Gas Sensor',
      subname: 'Air Quality & Hazardous Gas (CO, NH3, Smoke)',
      icon: Wind,
      color: '#f59e0b',
      topic: `${mqttTopicPrefix}/control/mq135`,
      valueDisplay: () => {
        if (!sensorControls.mq135) {
          return sensorControls.safetyOverride
            ? 'Disabled (Safety alert override armed)'
            : 'Disabled — Telemetry Paused';
        }
        const val = readings.gas ?? 0;
        const status = val > 300 ? 'Hazardous' : val > 180 ? 'Elevated' : 'Normal / Clean';
        return `${val} ppm • ${status}`;
      },
      isAlert: readings.gas > 300,
    },
    {
      id: 'flame',
      name: 'Flame Sensor',
      subname: 'Infrared Spectral Flame Detection',
      icon: Flame,
      color: '#ef4444',
      topic: `${mqttTopicPrefix}/control/flame`,
      valueDisplay: () => {
        if (!sensorControls.flame) {
          return sensorControls.safetyOverride
            ? 'Disabled (Emergency fire alert armed)'
            : 'Disabled — Detection Paused';
        }
        return readings.flame === 1 ? 'FIRE / FLAME DETECTED!' : 'Normal / Safe (No Fire)';
      },
      isAlert: readings.flame === 1,
    },
    {
      id: 'rain',
      name: 'Rain Sensor',
      subname: 'Surface Moisture & Precipitation',
      icon: CloudRain,
      color: '#3b82f6',
      topic: `${mqttTopicPrefix}/control/rain`,
      valueDisplay: () => {
        if (!sensorControls.rain) return 'Disabled — Detection Paused';
        return readings.rain === 1 ? 'Rain / Wet Surface Detected' : 'Dry Surface';
      },
      isAlert: readings.rain === 1,
    },
    {
      id: 'sound',
      name: 'Sound Sensor',
      subname: 'Acoustic Sound & Noise Detection',
      icon: Mic,
      color: '#a855f7',
      topic: `${mqttTopicPrefix}/control/sound`,
      valueDisplay: () => {
        if (!sensorControls.sound) return 'Disabled — Telemetry Paused';
        const val = readings.sound ?? 0;
        return `Intensity: ${val} • ${val > 700 ? 'High Noise' : 'Normal'}`;
      },
      isAlert: readings.sound > 700,
    },
    {
      id: 'motion',
      name: 'PIR Motion Sensor',
      subname: 'Passive Infrared Motion Detector',
      icon: Radar,
      color: '#06b6d4',
      topic: `${mqttTopicPrefix}/control/motion`,
      valueDisplay: () => {
        if (!sensorControls.motion) return 'Disabled — Detection Paused';
        return readings.motion === 1 ? 'Motion Detected in Area' : 'Clear / No Movement';
      },
      isAlert: readings.motion === 1,
    },
    {
      id: 'dht11',
      name: 'DHT11 Sensor',
      subname: 'Temperature & Humidity Dual Sensor',
      icon: Thermometer,
      color: '#10b981',
      topic: `${mqttTopicPrefix}/control/dht11`,
      valueDisplay: () => {
        if (!sensorControls.dht11) return 'Disabled — Updates Paused';
        const temp = readings.temp ?? '--';
        const hum = readings.hum ?? '--';
        return `${temp}°C Temperature • ${hum}% Humidity`;
      },
      isAlert: (readings.temp ?? 0) > 45,
    },
  ];

  // Actuators
  const ACTUATORS = [
    {
      id: 'buzzer',
      name: 'Buzzer Alarm',
      desc: 'Piezo buzzer hardware audible siren',
      icon: sensorControls.buzzer ? Volume2 : VolumeX,
      color: '#ef4444',
      topic: `${mqttTopicPrefix}/control/buzzer`,
      activeText: 'Sounding (Siren Active)',
      inactiveText: 'Silent / Disarmed',
    },
    {
      id: 'redLed',
      name: 'Red Alert LED',
      desc: 'Visual warning hazard beacon',
      icon: Lightbulb,
      color: '#ef4444',
      topic: `${mqttTopicPrefix}/control/red-led`,
      activeText: 'Illuminated (ON)',
      inactiveText: 'Extinguished (OFF)',
    },
    {
      id: 'blueLed',
      name: 'Blue Status LED',
      desc: 'Online & telemetry activity indicator',
      icon: Lightbulb,
      color: '#3b82f6',
      topic: `${mqttTopicPrefix}/control/blue-led`,
      activeText: 'Illuminated (ON)',
      inactiveText: 'Extinguished (OFF)',
    },
  ];

  return (
    <div className="sensor-controls-section">
      {/* Top Banner & Control Actions */}
      <div className="controls-header-card">
        <div className="controls-header-text">
          <div className="controls-header-badge">
            <Radio size={14} className={mqttConnected ? 'icon-pulse' : ''} />
            <span>MQTT Command Center</span>
            <span className={`status-pill ${mqttConnected ? 'online' : 'offline'}`}>
              {mqttStatus.toUpperCase()}
            </span>
          </div>
          <h2 className="headline-small" style={{ margin: '8px 0 4px' }}>
            Hardware Sensor & Actuator Controls
          </h2>
          <p className="body-default" style={{ color: 'var(--muted)' }}>
            Toggle individual hardware sensors on your ESP32 in real time. Commands are published as{' '}
            <code>ON</code> / <code>OFF</code> via HiveMQ WebSockets with retain flags and synchronized automatically when the ESP32 reconnects.
          </p>
        </div>

        <div className="controls-header-actions">
          <button
            onClick={syncAllControls}
            className="control-action-btn sync-btn"
            title="Republish all switch states to broker"
          >
            <RefreshCw size={15} />
            <span>Sync All to ESP32</span>
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="control-action-btn config-btn"
            title="Configure MQTT broker and topics"
          >
            <Settings size={15} />
            <span>MQTT Config</span>
          </button>
        </div>
      </div>

      {/* Expandable MQTT Broker Configuration */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            className="mqtt-config-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <form onSubmit={handleSaveConfig} className="mqtt-config-form">
              <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Broker & Topic Settings</h4>
              <div className="config-grid">
                <div className="form-group">
                  <label className="form-label">Browser WebSocket URL</label>
                  <input
                    className="form-input"
                    type="text"
                    value={brokerInput}
                    onChange={(e) => setBrokerInput(e.target.value)}
                    placeholder="wss://broker.hivemq.com:8884/mqtt"
                  />
                  <span className="caption">
                    Public HiveMQ: <code>wss://broker.hivemq.com:8884/mqtt</code> (TCP port for ESP32 is <code>1883</code>)
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">MQTT Topic Prefix</label>
                  <input
                    className="form-input"
                    type="text"
                    value={prefixInput}
                    onChange={(e) => setPrefixInput(e.target.value)}
                    placeholder="iot-hub"
                  />
                  <span className="caption">
                    Command topics: <code>{prefixInput}/control/&lt;sensor&gt;</code>
                  </span>
                </div>
              </div>
              <div className="config-form-actions">
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                  Save & Reconnect
                </button>
                <button
                  type="button"
                  onClick={handleResetConfig}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Reset Defaults
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety Override Card */}
      <div className={`safety-override-card ${sensorControls.safetyOverride ? 'active' : ''}`}>
        <div className="safety-card-left">
          <div className="safety-icon-wrap">
            {sensorControls.safetyOverride ? (
              <ShieldAlert size={24} style={{ color: 'var(--ok)' }} />
            ) : (
              <Shield size={24} style={{ color: 'var(--muted)' }} />
            )}
          </div>
          <div>
            <div className="safety-title-row">
              <span className="safety-title">Safety Protocol: Emergency Flame & Gas Override</span>
              <span className={`safety-status-badge ${sensorControls.safetyOverride ? 'armed' : 'disarmed'}`}>
                {sensorControls.safetyOverride ? 'ARMED & ACTIVE' : 'DISARMED'}
              </span>
            </div>
            <p className="safety-desc">
              When armed, safety-critical Gas (MQ-135) and Fire (Flame) alerts will trigger in emergencies even if the individual sensor telemetry switches below are turned off.
            </p>
          </div>
        </div>

        <div className="safety-card-right">
          <button
            type="button"
            className={`switch-toggle ${sensorControls.safetyOverride ? 'on' : 'off'}`}
            onClick={handleSafetyToggle}
            aria-label="Toggle safety alert override"
          >
            <span className="switch-handle" />
          </button>
        </div>
      </div>

      {/* SENSORS SECTION */}
      <div className="section-title-wrap">
        <h3 className="section-title">Environmental Sensors (6 Modules)</h3>
        <span className="caption">
          Individual ON/OFF control for telemetry publishing and alerts
        </span>
      </div>

      <div className="sensor-controls-grid">
        {SENSORS.map((sensor) => {
          const isEnabled = !!sensorControls[sensor.id];
          const isAlert = sensor.isAlert && isEnabled;

          return (
            <motion.div
              key={sensor.id}
              className={`sensor-control-card ${isEnabled ? 'enabled' : 'disabled'} ${
                isAlert ? 'alert-active' : ''
              }`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sensor-card-top">
                <div className="sensor-info-block">
                  <div
                    className="sensor-icon-box"
                    style={{
                      background: isEnabled ? `${sensor.color}20` : 'rgba(255,255,255,0.04)',
                      color: isEnabled ? sensor.color : 'var(--muted)',
                    }}
                  >
                    <sensor.icon size={22} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="sensor-name">{sensor.name}</h4>
                    <span className="sensor-subname">{sensor.subname}</span>
                  </div>
                </div>

                {/* Switch Button */}
                <button
                  type="button"
                  className={`switch-toggle ${isEnabled ? 'on' : 'off'}`}
                  onClick={() => handleToggle(sensor.id)}
                  aria-label={`Toggle ${sensor.name}`}
                >
                  <span className="switch-handle" />
                </button>
              </div>

              {/* Status and Reading Bar */}
              <div className="sensor-card-body">
                <div className="sensor-reading-row">
                  <span className="reading-label">Status & Reading:</span>
                  <span
                    className={`reading-val ${isEnabled ? (isAlert ? 'danger-val' : 'normal-val') : 'disabled-val'}`}
                  >
                    {sensor.valueDisplay()}
                  </span>
                </div>
              </div>

              {/* Card Footer with MQTT Topic */}
              <div className="sensor-card-footer">
                <div className="state-indicator-pill">
                  <span className={`state-dot ${isEnabled ? 'active-dot' : 'inactive-dot'}`} />
                  <span className="state-text">{isEnabled ? 'ENABLED (ON)' : 'DISABLED (OFF)'}</span>
                </div>
                <span className="topic-tag" title="MQTT Command Topic">
                  <code>{sensor.topic}</code>
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ACTUATORS & HARDWARE OUTPUTS */}
      <div className="section-title-wrap" style={{ marginTop: '36px' }}>
        <h3 className="section-title">Actuators & Hardware Indicators</h3>
        <span className="caption">
          Manual triggering of audio alarm and onboard indicator LEDs
        </span>
      </div>

      <div className="actuators-grid">
        {ACTUATORS.map((actuator) => {
          const isActive = !!sensorControls[actuator.id];

          return (
            <motion.div
              key={actuator.id}
              className={`actuator-card ${isActive ? 'actuator-active' : ''}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="actuator-card-top">
                <div className="actuator-info-block">
                  <div
                    className="actuator-icon-box"
                    style={{
                      background: isActive ? `${actuator.color}25` : 'rgba(255,255,255,0.04)',
                      color: isActive ? actuator.color : 'var(--muted)',
                    }}
                  >
                    <actuator.icon size={22} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h4 className="actuator-name">{actuator.name}</h4>
                    <span className="actuator-desc">{actuator.desc}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className={`switch-toggle ${isActive ? 'on' : 'off'}`}
                  onClick={() => handleToggle(actuator.id)}
                  aria-label={`Toggle ${actuator.name}`}
                >
                  <span className="switch-handle" />
                </button>
              </div>

              <div className="actuator-card-footer">
                <span className={`actuator-status-text ${isActive ? 'active' : 'inactive'}`}>
                  {isActive ? actuator.activeText : actuator.inactiveText}
                </span>
                <span className="topic-tag">
                  <code>{actuator.topic}</code>
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
