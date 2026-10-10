import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Sliders, Bell, Shield } from 'lucide-react';
import useStore from '../store/useStore';
import './Admin.css';

const TABS = [
  { key: 'thresholds', label: 'Thresholds', icon: Sliders },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('thresholds');
  const { thresholds, setThresholds, user } = useStore();

  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <Shield size={48} strokeWidth={1} style={{ color: 'var(--muted)', marginBottom: '16px' }} />
          <h2 className="headline-small">Access Denied</h2>
          <p className="body-default">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="headline-small" style={{ marginBottom: '4px' }}>Admin Panel</h1>
        <p className="body-default">Manage thresholds, users, and notifications</p>
      </div>

      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon size={14} style={{ marginRight: '6px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'thresholds' && (
        <ThresholdsPanel thresholds={thresholds} setThresholds={setThresholds} />
      )}
      {activeTab === 'users' && <UsersPanel />}
      {activeTab === 'notifications' && <NotificationsPanel />}
    </div>
  );
}

function ThresholdsPanel({ thresholds, setThresholds }) {
  const [local, setLocal] = useState(thresholds);
  const { addToast } = useStore();

  const save = () => {
    setThresholds(local);
    addToast('Thresholds updated', 'success');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-panel">
      <h3 style={{ marginBottom: '24px', fontWeight: 600 }}>Alert Thresholds</h3>
      <div className="threshold-grid">
        <div className="form-group">
          <label className="form-label">Temperature High (°C)</label>
          <input
            className="form-input"
            type="number"
            value={local.tempHigh}
            onChange={(e) => setLocal({ ...local, tempHigh: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Humidity High (%)</label>
          <input
            className="form-input"
            type="number"
            value={local.humHigh}
            onChange={(e) => setLocal({ ...local, humHigh: Number(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Sound High</label>
          <input
            className="form-input"
            type="number"
            value={local.soundHigh}
            onChange={(e) => setLocal({ ...local, soundHigh: Number(e.target.value) })}
          />
        </div>
      </div>
      <p className="caption" style={{ margin: '16px 0' }}>Flame and rain alerts are always active (binary sensors).</p>
      <button className="btn-primary" onClick={save} style={{ fontSize: '14px', padding: '10px 24px' }}>
        Save Thresholds
      </button>
    </motion.div>
  );
}

function UsersPanel() {
  const demoUsers = [
    { name: 'Admin User', email: 'admin@sentinel.io', role: 'admin', joined: '2024-01-15' },
    { name: 'Viewer User', email: 'viewer@sentinel.io', role: 'viewer', joined: '2024-02-20' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-panel">
      <h3 style={{ marginBottom: '24px', fontWeight: 600 }}>Users</h3>
      <div className="users-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {demoUsers.map((u, i) => (
              <tr key={i}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={`role-badge ${u.role}`}>{u.role}</span>
                </td>
                <td>{u.joined}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caption" style={{ marginTop: '16px' }}>User management requires backend connection.</p>
    </motion.div>
  );
}

function NotificationsPanel() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const { addToast } = useStore();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="admin-panel">
      <h3 style={{ marginBottom: '24px', fontWeight: 600 }}>Notification Settings</h3>
      <div className="notif-options">
        <label className="notif-option">
          <span>Email alerts on critical events</span>
          <input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} />
        </label>
        <label className="notif-option">
          <span>Dashboard sound on alerts</span>
          <input type="checkbox" checked={soundAlerts} onChange={() => setSoundAlerts(!soundAlerts)} />
        </label>
      </div>
      <button
        className="btn-primary"
        onClick={() => addToast('Notification settings saved', 'success')}
        style={{ marginTop: '24px', fontSize: '14px', padding: '10px 24px' }}
      >
        Save Settings
      </button>
    </motion.div>
  );
}
