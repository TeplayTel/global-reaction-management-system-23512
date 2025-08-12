import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import VideoPanel from './components/VideoPanel';
import SegmentedControl from './components/SegmentedControl';
import AnalyticsPanel from './components/AnalyticsPanel';
import EmojiManager from './components/EmojiManager';

// PUBLIC_INTERFACE
export default function App() {
  const [theme, setTheme] = useState('dark');
  const [authed, setAuthed] = useState(false);
  const [panel, setPanel] = useState('analytics'); // 'analytics' | 'emojis'

  useEffect(() => {
    const storedTheme = (localStorage.getItem('admin_theme') || process.env.REACT_APP_THEME || 'dark');
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    setAuthed(!!token);
  }, []);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  if (!authed) {
    return <Login onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="page">
      <Header onToggleTheme={toggleTheme} theme={theme} />
      <main className="main" role="main">
        <VideoPanel />
        <aside className="card" aria-label="Admin side panel">
          <div className="panel-header">
            <SegmentedControl
              options={[
                { id: 'analytics', label: 'Analytics' },
                { id: 'emojis', label: 'Emojis' },
              ]}
              value={panel}
              onChange={setPanel}
            />
            <span className="small muted" aria-hidden="true">v0.1</span>
          </div>

          {panel === 'analytics' ? <AnalyticsPanel /> : <EmojiManager />}
        </aside>
      </main>
    </div>
  );
}

/**
 * Simple login form that stores a mock token.
 * PUBLIC_INTERFACE
 */
function Login({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email || !pwd) {
      setErr('Email and password are required.');
      return;
    }
    setBusy(true);
    try {
      // In a real app, call backend auth here
      await new Promise(r => setTimeout(r, 400));
      localStorage.setItem('admin_token', 'mock-token');
      onSuccess?.();
    } catch (e2) {
      setErr('Login failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card" role="dialog" aria-labelledby="admin-login-title">
        <h2 id="admin-login-title">Admin Login</h2>
        <p className="muted">Sign in to manage emojis and view analytics.</p>

        <form onSubmit={submit}>
          <div className="form-inline" style={{ marginTop: 8 }}>
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              disabled={busy}
              aria-label="Email"
            />
          </div>
          <div className="form-inline">
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              aria-label="Password"
            />
          </div>
          {err ? <p className="small" style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</p> : null}
          <div className="actions">
            <button className="btn" type="button" disabled={busy} onClick={() => { setEmail(''); setPwd(''); }}>Clear</button>
            <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button>
          </div>
        </form>
        <p className="small muted" style={{ marginTop: 12 }}>
          This demo uses client-side mock authentication. Configure backend auth and set REACT_APP_API_BASE_URL to enable real login.
        </p>
      </div>
    </div>
  );
}
