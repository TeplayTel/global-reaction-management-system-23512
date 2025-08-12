import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager allows admins to add or remove emojis that appear in the user app.
 * Redesigned with a detailed card/grid layout, per-emoji usage stat, and removal confirmation.
 * @returns {JSX.Element}
 */
export default function EmojiManager() {
  const [emojis, setEmojis] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [counts, setCounts] = useState({}); // per-emoji usage count (mocked on frontend)
  const confirmRef = useRef(null);

  // Seed a deterministic-ish usage count for an emoji symbol
  const seedCount = (emoji) => {
    if (!emoji) return 0;
    // Use code points sum to create a base, then add a small random component
    const codePoints = Array.from(emoji).map((c) => c.codePointAt(0) || 0);
    const base = codePoints.reduce((a, b) => a + b, 0);
    const rand = Math.floor((Math.sin(base) + 1) * 25); // 0-50 approx deterministic
    return Math.max(5, base % 100) + rand; // keep it non-zero for visualization
  };

  // Ensure counts exist for all emojis
  const ensureCounts = (list) => {
    setCounts((prev) => {
      const updated = { ...prev };
      for (const e of list) {
        if (updated[e] == null) updated[e] = seedCount(e);
      }
      // Clean up removed emojis
      Object.keys(updated).forEach((k) => {
        if (!list.includes(k)) delete updated[k];
      });
      return updated;
    });
  };

  const load = async () => {
    try {
      const list = await getEmojis();
      setEmojis(list);
      ensureCounts(list);
    } catch (e) {
      // handled in service, no-op
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // "real-time" updates via polling
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Randomly nudge counts to simulate updated usage
  useEffect(() => {
    const tick = setInterval(() => {
      setCounts((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const delta = Math.floor(Math.random() * 7) - 3; // -3..+3
          next[k] = Math.max(0, next[k] + delta);
        });
        return next;
      });
    }, 4500);
    return () => clearInterval(tick);
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    setError('');
    const value = input.trim();
    if (!value) {
      setError('Please enter an emoji.');
      return;
    }
    setBusy(true);
    try {
      const updated = await addEmoji(value);
      setEmojis(updated);
      ensureCounts(updated);
      setInput('');
    } catch (err) {
      setError(err?.message || 'Unable to add emoji.');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (emoji) => {
    setBusy(true);
    setError('');
    try {
      const updated = await removeEmoji(emoji);
      setEmojis(updated);
      ensureCounts(updated);
    } catch (err) {
      setError(err?.message || 'Unable to remove emoji.');
    } finally {
      setBusy(false);
      setConfirmTarget(null);
    }
  };

  // Sum and max for percentage visualization
  const { totalCount, maxCount } = useMemo(() => {
    const vals = emojis.map((e) => counts[e] || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const max = vals.reduce((a, b) => Math.max(a, b), 0);
    return { totalCount: sum, maxCount: max };
  }, [counts, emojis]);

  // Focus confirmation area when it appears
  useEffect(() => {
    if (confirmTarget && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [confirmTarget]);

  return (
    <div className="emoji-manager">
      <h2 className="panel-title">Emoji Management</h2>

      <p className="muted small" id="emoji-manager-helper">
        Manage the set of emojis that viewers can use live. Add new emojis below.
        Removing an emoji hides it immediately for all viewers.
      </p>

      {/* Add section */}
      <section
        className="add-card"
        aria-labelledby="add-emoji-title"
        aria-describedby="add-emoji-desc"
      >
        <div className="add-card__header">
          <div>
            <h3 id="add-emoji-title" className="add-card__title">Add new emoji</h3>
            <p id="add-emoji-desc" className="muted small">
              Paste any Unicode emoji (e.g., 🔥). Keep the list under 12 items for an optimal layout.
            </p>
          </div>
        </div>
        <form className="form-inline" onSubmit={onAdd}>
          <label htmlFor="emoji-input" className="sr-only">Emoji input</label>
          <input
            id="emoji-input"
            className="input"
            placeholder="Type or paste an emoji (e.g., 🔥)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Emoji input"
            disabled={busy}
          />
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>
      </section>

      {error ? (
        <p className="small" role="alert" style={{ color: 'var(--danger)', marginTop: 8 }}>
          {error}
        </p>
      ) : null}

      {/* Emoji grid */}
      <div className="emoji-grid" role="list" aria-label="Current emoji list">
        {emojis.length === 0 ? (
          <div className="empty-state" role="note" aria-live="polite">
            <div className="empty-emoji" aria-hidden="true">🧩</div>
            <div className="empty-text">
              <strong>No emojis configured</strong>
              <span className="muted small">Add your first emoji using the form above.</span>
            </div>
          </div>
        ) : (
          emojis.map((e) => {
            const usage = counts[e] || 0;
            const pct = totalCount > 0 ? Math.round((usage / totalCount) * 100) : 0;
            const strength = maxCount > 0 ? Math.max(8, Math.round((usage / maxCount) * 100)) : 0;
            const showingConfirm = confirmTarget === e;

            return (
              <article
                key={e}
                className="emoji-card"
                role="listitem"
                aria-label={`Emoji ${e}`}
              >
                <div className="emoji-card__row">
                  <div className="emoji-icon" aria-hidden="true">
                    <span className="emoji">{e}</span>
                  </div>
                  <div className="emoji-meta">
                    {/* Label could be displayed here if available from backend in future */}
                    <div className="emoji-title">
                      <span className="emoji-label">Emoji</span>
                      <span className="emoji-char" aria-hidden="true">{e}</span>
                    </div>
                    <div className="emoji-usage small muted">
                      Usage today: <strong className="usage-strong">{usage}</strong> &middot; {pct}% of total
                    </div>
                  </div>
                </div>

                <div
                  className="usage-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`Popularity of ${e}`}
                >
                  <div className="usage-bar__fill" style={{ width: `${strength}%` }} />
                </div>

                {/* Actions */}
                {!showingConfirm ? (
                  <div className="emoji-actions">
                    <button
                      className="btn danger"
                      onClick={() => setConfirmTarget(e)}
                      aria-controls={`confirm-${encodeURIComponent(e)}`}
                      aria-expanded="false"
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    id={`confirm-${encodeURIComponent(e)}`}
                    className="emoji-confirm"
                    role="alertdialog"
                    aria-labelledby={`confirm-title-${encodeURIComponent(e)}`}
                    aria-describedby={`confirm-desc-${encodeURIComponent(e)}`}
                    tabIndex={-1}
                    ref={confirmRef}
                  >
                    <div className="confirm-texts">
                      <div id={`confirm-title-${encodeURIComponent(e)}`} className="small">
                        Remove this emoji?
                      </div>
                      <div id={`confirm-desc-${encodeURIComponent(e)}`} className="muted small">
                        This action takes effect immediately for all viewers.
                      </div>
                    </div>
                    <div className="confirm-actions">
                      <button
                        className="btn"
                        onClick={() => setConfirmTarget(null)}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => onRemove(e)}
                        disabled={busy}
                      >
                        {busy ? 'Removing…' : 'Confirm remove'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
