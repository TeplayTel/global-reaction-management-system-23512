import React, { useEffect, useState } from 'react';
import './App.css';
import Header from './components/Header';
import SegmentedControl from './components/SegmentedControl';
import AnalyticsPanel from './components/AnalyticsPanel';
import EmojiManager from './components/EmojiManager';

// PUBLIC_INTERFACE
export default function App() {
  /** Admin dashboard app entrypoint without authentication. Renders the dashboard with analytics and emoji management. */
  const [panel, setPanel] = useState('emojis'); // 'analytics' | 'emojis'

  // Apply dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <div className="page">
      <Header />
      <main className="main" role="main">
        {/* Single main card spanning full content area with segmented control */}
        <section
          className="card"
          aria-label="Admin dashboard"
          style={{ gridColumn: '1 / -1' }}
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
          </div>

          {panel === 'analytics' ? <AnalyticsPanel /> : <EmojiManager />}
        </section>
      </main>
    </div>
  );
}
