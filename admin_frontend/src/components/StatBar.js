import React from 'react';

/**
 * StatBar displays a label and a dual-color bar for red/blue percentages.
 * PUBLIC_INTERFACE
 * @param {{label:string, red:number, blue:number}} props 
 */
export default function StatBar({ label, red, blue }) {
  const safeRed = Math.max(0, Math.min(100, red || 0));
  const safeBlue = Math.max(0, Math.min(100, blue || 0));
  return (
    <div className="stat-row" role="group" aria-label={`${label} statistic`}>
      <div className="row-top">
        <span className="label">{label}</span>
        <div className="spacer" />
        <span className="value red" aria-label="Team red percentage">{safeRed}%</span>
        <span className="value blue" aria-label="Team blue percentage">{safeBlue}%</span>
      </div>
      <div
        className="bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeRed}
        aria-label={`${label} red side`}
      >
        <div className="bar-red" style={{ width: `${safeRed}%` }} />
        <div className="bar-blue" style={{ width: `${safeBlue}%` }} />
      </div>
    </div>
  );
}
