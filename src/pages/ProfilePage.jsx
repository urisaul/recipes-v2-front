import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { PORTAL_ID } from '../lib/constants';
import { getApiClient } from '../lib/portalApi';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    bio: '',
    website: '',
    instagram: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    defaultPublic: false,
    emailNotif: true,
  });
  const [recipesCount, setRecipesCount] = useState('--');
  const [savesCount, setSavesCount] = useState('--');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  useEffect(() => {
    (async () => {
      try {
        const api = await getApiClient();
        const [verified, dataRes] = await Promise.all([
          api.auth.verifyToken(),
          api.auth.getData({ portalId: PORTAL_ID }),
        ]);

        const name = `${verified.firstName || ''} ${verified.lastName || ''}`.trim() || verified.email || '';
        setUser({ displayName: name, shortName: verified.firstName || name });
        setProfile((prev) => ({
          ...prev,
          firstName: verified.firstName || '',
          lastName: verified.lastName || '',
          username: verified.username || '',
          email: verified.email || '',
          bio: verified.bio || '',
          website: verified.website || '',
          instagram: verified.instagram || '',
        }));

        const records = Array.isArray(dataRes) ? dataRes : dataRes?.data ?? [];
        setRecipesCount(records.length);
        if (dataRes?.savesCount !== undefined) setSavesCount(dataRes.savesCount);
      } catch {
        navigate('/login');
      }
    })();
  }, [navigate]);

  function showAlert(setter, message) {
    setter(message);
    window.setTimeout(() => setter(''), 3500);
  }

  async function onSaveProfile(e) {
    e.preventDefault();
    try {
      const api = await getApiClient();
      await api.auth.updateProfile({
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        username: profile.username.trim(),
        email: profile.email.trim(),
        bio: profile.bio.trim(),
        website: profile.website.trim(),
        instagram: profile.instagram.trim(),
      });
      showAlert(setSuccess, '✓ Changes saved successfully.');
    } catch (err) {
      showAlert(setError, err?.data?.message || 'Failed to save. Please try again.');
    }
  }

  async function onSavePassword(e) {
    e.preventDefault();
    if (profile.newPassword.length < 8) {
      alert('Password must be at least 8 characters.');
      return;
    }
    if (profile.newPassword !== profile.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const api = await getApiClient();
      await api.auth.updateProfile({ currentPassword: profile.currentPassword, password: profile.newPassword });
      setProfile((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
      showAlert(setSuccess, '✓ Changes saved successfully.');
    } catch (err) {
      showAlert(setError, err?.data?.message || 'Failed to update password.');
    }
  }

  async function onAvatarChange(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const api = await getApiClient();
      await api.auth.updateProfile(fd);
      showAlert(setSuccess, '✓ Changes saved successfully.');
    } catch {}
  }

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const initial = (name?.[0] || profile.email?.[0] || '?').toUpperCase();

  return (
    <>
      <Navbar
        links={[
          { to: '/', label: 'Home', end: true },
          { to: '/my-account', label: 'My Recipes' },
          { to: '/profile', label: 'Profile' },
        ]}
        user={user}
      />

      <div className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div>
              <h1 className="page-title">Profile & Settings</h1>
              <p className="page-subtitle">Manage your account details and preferences</p>
            </div>
            <Link to="/my-account" className="btn btn-outline">← My Recipes</Link>
          </div>
        </div>
      </div>

      <div className="container page-content">
        <div className="profile-layout">
          <aside className="profile-sidebar">
            <div className="profile-avatar-wrap">
              <div className="avatar avatar--xl" id="sidebarAvatar">{initial}</div>
              <button className="profile-avatar-edit-btn" type="button" onClick={() => document.getElementById('avatarInput').click()}>✎</button>
              <input
                id="avatarInput"
                className="avatar-input"
                type="file"
                accept="image/*"
                onChange={(e) => onAvatarChange(e.target.files?.[0])}
              />
            </div>

            <div className="profile-name">{name || user?.displayName || ''}</div>
            <div className="profile-username">@{profile.username || ''}</div>
            <p className="profile-bio" id="sidebarBio">{profile.bio}</p>

            <div className="profile-stats">
              <div className="profile-stat"><span className="profile-stat-value">{recipesCount}</span><span className="profile-stat-label">Recipes</span></div>
              <div className="profile-stat"><span className="profile-stat-value">{savesCount}</span><span className="profile-stat-label">Saves</span></div>
            </div>
          </aside>

          <div className="profile-main">
            {success ? <div className="alert alert--success" style={{ display: 'block' }}>{success}</div> : null}
            {error ? <div className="alert alert--error" style={{ display: 'block' }}>{error}</div> : null}

            <div className="card">
              <div className="card-header">Edit Profile</div>
              <div className="card-body">
                <form onSubmit={onSaveProfile} noValidate>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="firstName">First Name</label>
                      <input id="firstName" className="form-input" value={profile.firstName} onChange={(e) => setProfile((v) => ({ ...v, firstName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="lastName">Last Name</label>
                      <input id="lastName" className="form-input" value={profile.lastName} onChange={(e) => setProfile((v) => ({ ...v, lastName: e.target.value }))} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="username">Username</label>
                    <input id="username" className="form-input" value={profile.username} onChange={(e) => setProfile((v) => ({ ...v, username: e.target.value }))} />
                    <span className="form-hint">Your public profile URL: recipebook.app/@janedoe</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="email">Email Address</label>
                    <input id="email" type="email" className="form-input" value={profile.email} onChange={(e) => setProfile((v) => ({ ...v, email: e.target.value }))} />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="bio">Bio</label>
                    <textarea id="bio" className="form-textarea" rows="3" maxLength="200" value={profile.bio} onChange={(e) => setProfile((v) => ({ ...v, bio: e.target.value }))} placeholder="Tell others a bit about your cooking style..." />
                    <span className="form-hint"><span>{profile.bio.length}</span>/200 characters</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="website">Website (optional)</label>
                      <input id="website" type="url" className="form-input" placeholder="https://yourblog.com" value={profile.website} onChange={(e) => setProfile((v) => ({ ...v, website: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="instagram">Instagram (optional)</label>
                      <input id="instagram" className="form-input" placeholder="@handle" value={profile.instagram} onChange={(e) => setProfile((v) => ({ ...v, instagram: e.target.value }))} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Save Profile</button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card">
              <div className="card-header">Change Password</div>
              <div className="card-body">
                <form onSubmit={onSavePassword} noValidate>
                  <div className="form-group">
                    <label className="form-label" htmlFor="currentPassword">Current Password</label>
                    <div className="password-field-wrap">
                      <input id="currentPassword" type={showPw.current ? 'text' : 'password'} className="form-input" value={profile.currentPassword} onChange={(e) => setProfile((v) => ({ ...v, currentPassword: e.target.value }))} placeholder="Enter current password" />
                      <button type="button" className="password-toggle" onClick={() => setShowPw((v) => ({ ...v, current: !v.current }))}>{showPw.current ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="newPassword">New Password</label>
                    <div className="password-field-wrap">
                      <input id="newPassword" type={showPw.next ? 'text' : 'password'} className="form-input" value={profile.newPassword} onChange={(e) => setProfile((v) => ({ ...v, newPassword: e.target.value }))} placeholder="At least 8 characters" />
                      <button type="button" className="password-toggle" onClick={() => setShowPw((v) => ({ ...v, next: !v.next }))}>{showPw.next ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="password-field-wrap">
                      <input id="confirmPassword" type={showPw.confirm ? 'text' : 'password'} className="form-input" value={profile.confirmPassword} onChange={(e) => setProfile((v) => ({ ...v, confirmPassword: e.target.value }))} placeholder="Repeat new password" />
                      <button type="button" className="password-toggle" onClick={() => setShowPw((v) => ({ ...v, confirm: !v.confirm }))}>{showPw.confirm ? 'Hide' : 'Show'}</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary">Update Password</button>
                  </div>
                </form>
              </div>
            </div>

            <div className="card">
              <div className="card-header">Preferences</div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Default recipe visibility</label>
                  <div className="toggle-wrap">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={profile.defaultPublic} onChange={(e) => setProfile((v) => ({ ...v, defaultPublic: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                    <span className="toggle-label">{profile.defaultPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <p className="form-hint">When enabled, new recipes will be public by default.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Email notifications</label>
                  <div className="toggle-wrap">
                    <label className="toggle-switch">
                      <input type="checkbox" checked={profile.emailNotif} onChange={(e) => setProfile((v) => ({ ...v, emailNotif: e.target.checked }))} />
                      <span className="toggle-slider" />
                    </label>
                    <span className="toggle-label">Notify me when someone saves my recipe</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card card--danger">
              <div className="card-header">Danger Zone</div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Delete Account</div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>Permanently delete your account and all your recipes. This cannot be undone.</div>
                  </div>
                  <a href="https://app.dande-link.com/form/6a22b5a37eebd3a3f9e69a73" className="btn btn-danger btn-sm" target="_blank" rel="noopener noreferrer">Request Account Deletion</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
