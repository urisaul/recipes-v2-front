import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { getApiClient } from '../lib/portalApi';

function ThemeButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme" type="button">
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}

export default function Navbar({ links = [], user, showAuthButtons = false, compact = false, onLogout }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    function onDocumentClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function onDocumentKeydown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onDocumentKeydown);

    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onDocumentKeydown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    try {
      const api = await getApiClient();
      api.auth.logout();
    } catch {
      // Logout is client-side, so we still continue to login even on non-critical errors.
    }

    if (typeof onLogout === 'function') {
      onLogout();
    }

    setMenuOpen(false);
    navigate('/login');
  }

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="logo">🍴 RecipeBook</Link>

        {/* {!compact && (
          <nav className="nav-links">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        )} */}

        <div className="nav-actions" style={compact ? { marginLeft: 'auto' } : undefined}>
          <ThemeButton />
          {showAuthButtons && (
            <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </>
          )}
          {!!user && !showAuthButtons && (
            <div className="nav-profile-menu" ref={menuRef}>
              <button
                className="nav-user nav-user-trigger"
                aria-label="My account"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
              >
                <div className="avatar avatar--sm">{(user.displayName?.[0] || '?').toUpperCase()}</div>
                <span className="nav-user-name">{user.shortName || user.displayName}</span>
              </button>

              <div className={`nav-dropdown ${menuOpen ? 'open' : ''}`} role="menu" aria-label="Profile menu">
                <Link to="/my-account" className="nav-dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  My Recipes
                </Link>
                <Link to="/profile" className="nav-dropdown-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                <button type="button" className="nav-dropdown-item nav-dropdown-item--danger" role="menuitem" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
