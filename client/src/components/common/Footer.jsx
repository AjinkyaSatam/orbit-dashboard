import { Link } from 'react-router-dom';
import Logo from '../brand/Logo';
import { siteConfig } from '../../content/siteConfig';
import { SOCIAL_ICONS, ICON_STROKE } from '../../lib/icons';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div style={{ marginBottom: '32px' }}>
          <Logo size={24} variant="lockup" />
          <p className="caption" style={{ marginTop: '8px', maxWidth: '360px' }}>
            {siteConfig.tagline}
          </p>
        </div>

        <div className="footer-columns">
          <div>
            <h4 className="footer-col-title">Product</h4>
            <Link to="/dashboard" className="footer-col-link">Dashboard</Link>
            <a href="#features" className="footer-col-link">Features</a>
            <a href="#specs" className="footer-col-link">Tech Specs</a>
            <a href="#how-it-works" className="footer-col-link">How It Works</a>
          </div>
          <div>
            <h4 className="footer-col-title">Resources</h4>
            <a href="#faq" className="footer-col-link">FAQ</a>
            <a href="#gallery" className="footer-col-link">Gallery</a>
            {siteConfig.repoUrl && (
              <a href={siteConfig.repoUrl} target="_blank" rel="noopener noreferrer" className="footer-col-link">
                Source Code
              </a>
            )}
            <a href="#specs" className="footer-col-link">Documentation</a>
          </div>
          <div>
            <h4 className="footer-col-title">Team</h4>
            <a href="#team" className="footer-col-link">Members</a>
            <a href="#guides" className="footer-col-link">Guides</a>
            <a href="#contact" className="footer-col-link">Contact</a>
          </div>
          <div>
            <h4 className="footer-col-title">Legal</h4>
            <a href="#" className="footer-col-link">Privacy Policy</a>
            <a href="#" className="footer-col-link">Terms of Use</a>
            <a href="#" className="footer-col-link">Disclaimer</a>
          </div>
        </div>

        {siteConfig.socials && siteConfig.socials.length > 0 && (
          <div className="footer-socials" style={{ display: 'flex', gap: '16px', margin: '20px 0' }}>
            {siteConfig.socials.map((s, i) => {
              const Icon = SOCIAL_ICONS[s.kind] || SOCIAL_ICONS.website;
              return (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="footer-col-link">
                  <Icon size={16} strokeWidth={ICON_STROKE} />
                </a>
              );
            })}
          </div>
        )}

        <div className="footer-bottom">
          <p className="footer-copy">
            Made by <strong>{siteConfig.team}</strong> — IoE Mini Project [YEAR].
            <br />
            <span className="footer-disclaimer">
              This is an academic project by [COLLEGE, DEPARTMENT, CITY]. Not a commercial product.
            </span>
          </p>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
