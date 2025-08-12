import React from 'react';
import { EyeIcon, SunIcon, MoonIcon } from './Icons';

/**
 * Header component shown on top of the dashboard.
 * @param {{onToggleTheme: () => void, theme: 'light'|'dark'}} props 
 */
export default function Header({ onToggleTheme, theme }) {
  return (
    <header className="header" role="banner">
      <div className="row">
        <div className="left">
          <h1 aria-label="Application title">Fan Engagement Live Admin</h1>
        </div>
        <div className="right">
          <div className="pill success" role="status" aria-live="polite">
            <EyeIcon aria-hidden="true" /> 1.8k watching
          </div>
          <button
            className="btn"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />} {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <div className="avatar" aria-label="Account avatar">
            <span className="small" aria-hidden="true">A</span>
          </div>
        </div>
      </div>
    </header>
  );
}
