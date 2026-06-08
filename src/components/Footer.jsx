import { Link } from 'react-router-dom';

export default function Footer({ showLegal = false, activeLegal }) {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="logo">🍴 RecipeBook</span>
        <p className="footer-text">© 2026 RecipeBook. Share food, share love.</p>
        {showLegal && (
          <nav style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Link to="/terms" className="footer-link" style={activeLegal === 'terms' ? { fontWeight: 600 } : undefined}>Terms</Link>
            <Link to="/privacy" className="footer-link" style={activeLegal === 'privacy' ? { fontWeight: 600 } : undefined}>Privacy</Link>
          </nav>
        )}
      </div>
    </footer>
  );
}
