import { Link, NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme" type="button">
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}

export default function Navbar({ links = [], user, showAuthButtons = false, compact = false }) {
  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo">🍴 RecipeBook</Link>

        {!compact && (
          <nav className="nav-links">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        <div className="nav-actions" style={compact ? { marginLeft: 'auto' } : undefined}>
          <ThemeButton />
          {showAuthButtons && (
            <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </>
          )}
          {!!user && !showAuthButtons && (
            <Link to="/profile" className="nav-user" aria-label="My account">
              <div className="avatar avatar--sm">{(user.displayName?.[0] || '?').toUpperCase()}</div>
              <span className="nav-user-name">{user.shortName || user.displayName}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
