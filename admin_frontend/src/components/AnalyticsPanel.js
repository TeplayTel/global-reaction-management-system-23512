import React, { useEffect, useState } from 'react';
import StatBar from './StatBar';
import { getAnalytics } from '../services/api';

/**
 * AnalyticsPanel fetches and renders analytics stat bars.
 * PUBLIC_INTERFACE
 * @returns JSX.Element
 */
export default function AnalyticsPanel() {
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        setError('');
        const data = await getAnalytics(); // can pass {eventId,userId,pageNo,pageSize} if needed
        if (!ignore) setStats(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!ignore) setError('Unable to load analytics.');
      }
    };

    load();
    const t = setInterval(load, 10000);
    return () => {
      ignore = true;
      clearInterval(t);
    };
  }, []);

  return (
    <div>
      <h2 className="panel-title">Analytics Overview</h2>
      {error ? <p className="small" role="alert" style={{ color: 'var(--danger)' }}>{error}</p> : null}
      <div className="stats" aria-live="polite">
        {stats.length === 0 ? (
          <p className="muted small">No analytics available.</p>
        ) : (
          stats.map(s => (
            <StatBar key={s.label} label={s.label} red={s.teamRed} blue={s.teamBlue} />
          ))
        )}
      </div>
    </div>
  );
}
