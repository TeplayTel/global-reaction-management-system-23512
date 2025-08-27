import React from 'react';

/**
 * Header component shown on top of the dashboard.
 * Kept clean, minimal, and professional.
 */
export default function Header() {
  return (
    <header className="header" role="banner">
      <div className="row">
        <div className="left">
          <h1 aria-label="Application title">Admin Dashboard</h1>
        </div>
        <div className="right">
          <div className="avatar" aria-label="Account avatar">
            <span className="small" aria-hidden="true">A</span>
          </div>
        </div>
      </div>
    </header>
  );
}
