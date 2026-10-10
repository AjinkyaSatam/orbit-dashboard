import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 style={{
          fontSize: 'clamp(80px, 15vw, 160px)',
          fontWeight: 600,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: 'var(--text)',
          opacity: 0.1,
        }}>
          404
        </h1>
        <h2 className="headline-medium" style={{ marginTop: '-20px', marginBottom: '12px' }}>
          Page not found.
        </h2>
        <p className="body-large" style={{ marginBottom: '32px', maxWidth: '400px' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-primary">
          Go home
        </Link>
      </motion.div>
    </div>
  );
}
