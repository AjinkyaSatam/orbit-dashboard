import { AnimatePresence, motion } from 'framer-motion';
import useStore from '../../store/useStore';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'var(--ok)',
  danger: 'var(--danger)',
  warning: 'var(--warn)',
  info: 'var(--accent)',
};

export default function ToastContainer() {
  const toasts = useStore((s) => s.toasts);

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type] || Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="toast"
            >
              <Icon size={16} style={{ color: COLORS[toast.type] || 'var(--accent)', flexShrink: 0 }} />
              <span>{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
