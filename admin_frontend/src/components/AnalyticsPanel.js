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

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      try {
        const data = await getAnalytics();
        if (!ignore) setStats(data);
      } catch {
        // Already handled in service
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
      <h2 className="panel-title">Global Emotion Analytics</h2>
      <div className="stats" aria-live="polite">
        {stats.map(s => (
          <StatBar key={s.label} label={s.label} red={s.teamRed} blue={s.teamBlue} />
        ))}
      </div>
    </div>
  );
}
