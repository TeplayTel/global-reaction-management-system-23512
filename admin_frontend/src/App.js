import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import SegmentedControl from './components/SegmentedControl';
import AnalyticsPanel from './components/AnalyticsPanel';
import EmojiManager from './components/EmojiManager';

// PUBLIC_INTERFACE
export default function App() {
  /** Admin dashboard app entrypoint without authentication. Renders the dashboard with analytics and emoji management. */
  const [theme, setTheme] = useState('dark');
  const [panel, setPanel] = useState('emojis'); // 'analytics' | 'emojis'

  useEffect(() => {
    const storedTheme = (localStorage.getItem('admin_theme') || process.env.REACT_APP_THEME || 'dark');
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle between dark and light themes for the admin dashboard. */
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="page">
      <Header onToggleTheme={toggleTheme} theme={theme} />
      <main className="main" role="main">
        {/* Single main card spanning full content area with segmented control */}
        <section
          className="card"
          aria-label="Admin dashboard"
          style={{ gridColumn: '1 / -1' }} // ensure full-width within existing grid layout
        >
          <div className="panel-header">
            <SegmentedControl
              options={[
                { id: 'emojis', label: 'Emojis' },
                { id: 'analytics', label: 'Analytics' },
              ]}
              value={panel}
              onChange={setPanel}
            />
            <span className="small muted" aria-hidden="true">v0.1</span>
          </div>

          {panel === 'analytics' ? <AnalyticsPanel /> : <EmojiManager />}
        </section>
      </main>
    </div>
  );
}
