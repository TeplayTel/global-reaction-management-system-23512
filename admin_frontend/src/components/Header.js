import React from 'react';

/**
 * Header component shown on top of the dashboard.
 * Kept clean, minimal, and professional.
 */
export default function Header() {
  return (
    <header className="header" role="banner" style={{ background: 'rgba(2,6,23,0.6)', borderBottom: '1px solid var(--stroke-soft)', backdropFilter: 'saturate(120%) blur(10px)' }}>
      <div className="row">
        <div className="left">
          <h1 aria-label="Application title" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
        </div>
        <div className="right">
          <div className="avatar" aria-label="Account avatar" style={{ background: 'var(--bg-elev-2)', color: 'var(--text-secondary)', borderColor: 'var(--stroke-soft)' }}>
            <span className="small" aria-hidden="true">A</span>
          </div>
        </div>
      </div>
    </header>
  );
}
