import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from '../brand/Logo';
import useStore from '../../store/useStore';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useStore();
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastY, setLastY] = useState(0);
  const location = useLocation();

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    if (y > 100) {
      setHidden(y > lastY && y - lastY > 5);
    } else {
      setHidden(false);
    }
    setLastY(y);
  }, [lastY]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const [prevPath, setPrevPath] = useState(location.pathname);
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMenuOpen(false);
  }

  const isLanding = location.pathname === '/';

  return (
    <nav className={`navbar ${hidden ? 'hidden' : ''}`} role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="Home">
          <Logo size={22} variant="lockup" />
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {isLanding && (
            <>
              <a href="#features" className="navbar-link">Features</a>
              <a href="#specs" className="navbar-link">Specs</a>
              <a href="#team" className="navbar-link">Team</a>
            </>
          )}
          <Link
            to="/dashboard"
            className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          {user ? (
            <>
              <Link
                to="/history"
                className={`navbar-link ${location.pathname === '/history' ? 'active' : ''}`}
              >
                History
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`navbar-link ${location.pathname === '/admin' ? 'active' : ''}`}
                >
                  Admin
                </Link>
              )}
              <button onClick={logout} className="navbar-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={`navbar-link ${location.pathname === '/login' ? 'active' : ''}`}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
