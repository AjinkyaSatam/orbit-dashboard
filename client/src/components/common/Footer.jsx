import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
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
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-col-link">GitHub</a>
            <a href="#" className="footer-col-link">Documentation</a>
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
        <div className="footer-bottom">
          <p className="footer-copy">
            Made by <strong>[TEAM NAME]</strong> — IoE Mini Project [YEAR].
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
