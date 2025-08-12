import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji, uploadEmojiImage } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager allows admins to add or remove emojis that appear in the user app.
 * Enhanced to support uploading image-based emojis with multipart/form-data.
 * Renders a detailed card/grid layout, per-emoji usage stat, removal confirmation for text emojis,
 * and upload form for new image emojis.
 * @returns {JSX.Element}
 */
export default function EmojiManager() {
  // Unified emoji entries: normalized to objects:
  // - Text emoji: { id, kind: 'text', char: '🔥' }
  // - Image emoji: { id, kind: 'image', emojiId, emojiType, imageUrl }
  const [emojis, setEmojis] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false); // add/remove busy
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null); // store entry id
  const [counts, setCounts] = useState({}); // per-emoji usage count (frontend simulated)
  const confirmRef = useRef(null);

  // Upload form state
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Normalize API/mocked list into unified objects
  const normalizeList = (rawList) => {
    const norm = [];
    (rawList || []).forEach((item) => {
      if (typeof item === 'string') {
        norm.push({
          id: `text:${item}`,
          kind: 'text',
          char: item,
        });
      } else if (item && typeof item === 'object') {
        const id = item.emojiId || `type:${item.emojiType || 'unknown'}:${item.imageUrl || Math.random()}`;
        norm.push({
          id,
          kind: 'image',
          ...item,
        });
      }
    });
    return norm;
  };

  // Seed a deterministic-ish usage count based on entry identity
  const seedCount = (entry) => {
    if (!entry) return 0;
    const source = entry.kind === 'text' ? entry.char : (entry.emojiType || entry.id || 'image');
    const codePoints = Array.from(source).map((c) => c.codePointAt(0) || 0);
    const base = codePoints.reduce((a, b) => a + b, 0);
    const rand = Math.floor((Math.sin(base) + 1) * 25); // 0-50 approx deterministic
    return Math.max(5, base % 100) + rand; // keep it non-zero for visualization
  };

  // Ensure counts exist for all entries
  const ensureCounts = (list) => {
    setCounts((prev) => {
      const updated = { ...prev };
      for (const e of list) {
        if (updated[e.id] == null) updated[e.id] = seedCount(e);
      }
      // Clean up removed emojis
      Object.keys(updated).forEach((k) => {
        if (!list.some((e) => e.id === k)) delete updated[k];
      });
      return updated;
    });
  };

  const load = async () => {
    try {
      const list = await getEmojis();
      const normalized = normalizeList(list);
      setEmojis(normalized);
      ensureCounts(normalized);
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
      const normalized = normalizeList(updated);
      setEmojis(normalized);
      ensureCounts(normalized);
      setInput('');
    } catch (err) {
      setError(err?.message || 'Unable to add emoji.');
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (entry) => {
    if (!entry || entry.kind !== 'text') return;
    setBusy(true);
    setError('');
    try {
      const updated = await removeEmoji(entry.char);
      const normalized = normalizeList(updated);
      setEmojis(normalized);
      ensureCounts(normalized);
    } catch (err) {
      setError(err?.message || 'Unable to remove emoji.');
    } finally {
      setBusy(false);
      setConfirmTarget(null);
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!uploadType.trim()) {
      setError('Please enter a type name for the emoji (e.g., "fire").');
      return;
    }
    if (!uploadFile) {
      setError('Please select an image file to upload.');
      return;
    }
    setUploadBusy(true);
    try {
      await uploadEmojiImage(uploadType.trim(), uploadFile);
      // Refresh list after successful upload
      await load();
      // Reset form
      setUploadType('');
      setUploadFile(null);
      // Reset file input value in DOM if needed
      if (e.target && e.target.reset) e.target.reset();
    } catch (err) {
      setError(err?.message || 'Unable to upload emoji image.');
    } finally {
      setUploadBusy(false);
    }
  };

  // Sum and max for percentage visualization
  const { totalCount, maxCount } = useMemo(() => {
    const vals = emojis.map((e) => counts[e.id] || 0);
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
        Manage the set of emojis that viewers can use live. Add Unicode emojis or upload image-based emojis.
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
              Paste any Unicode emoji (e.g., 🔥) or upload a custom image emoji.
            </p>
          </div>
        </div>
        {/* Add Unicode emoji */}
        <form className="form-inline" onSubmit={onAdd}>
          <label htmlFor="emoji-input" className="sr-only">Emoji input</label>
          <input
            id="emoji-input"
            className="input"
            placeholder="Type or paste an emoji (e.g., 🔥)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Emoji input"
            disabled={busy || uploadBusy}
          />
          <button className="btn primary" type="submit" disabled={busy || uploadBusy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>

        {/* Upload image emoji */}
        <form className="form-inline" onSubmit={onUpload} style={{ marginTop: 8 }}>
          <label htmlFor="emoji-type" className="sr-only">Emoji type</label>
          <input
            id="emoji-type"
            className="input"
            placeholder="Type (e.g., fire, clap)"
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            aria-label="Emoji type"
            disabled={busy || uploadBusy}
            style={{ flex: 0.6 }}
          />
          <label htmlFor="emoji-file" className="sr-only">Emoji image</label>
          <input
            id="emoji-file"
            type="file"
            accept="image/*"
            aria-label="Emoji image file"
            onChange={(e) => setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            disabled={busy || uploadBusy}
            style={{ color: 'var(--text-secondary)' }}
          />
          <button className="btn" type="submit" disabled={busy || uploadBusy}>
            {uploadBusy ? 'Uploading…' : 'Upload image'}
          </button>
        </form>

        <p className="small muted" style={{ marginTop: 6 }}>
          Note: Set REACT_APP_ADMIN_TOKEN in .env for Authorization to the upload API.
        </p>
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
          emojis.map((entry) => {
            const usage = counts[entry.id] || 0;
            const pct = totalCount > 0 ? Math.round((usage / totalCount) * 100) : 0;
            const strength = maxCount > 0 ? Math.max(8, Math.round((usage / maxCount) * 100)) : 0;
            const showingConfirm = confirmTarget === entry.id;

            const label = entry.kind === 'text'
              ? `Emoji ${entry.char}`
              : `Emoji ${entry.emojiType || entry.emojiId || 'image'}`;

            return (
              <article
                key={entry.id}
                className="emoji-card"
                role="listitem"
                aria-label={label}
              >
                <div className="emoji-card__row">
                  <div className="emoji-icon" aria-hidden="true">
                    {entry.kind === 'text' ? (
                      <span className="emoji">{entry.char}</span>
                    ) : (
                      <img
                        src={entry.imageUrl}
                        alt={entry.emojiType ? `${entry.emojiType} emoji` : 'Uploaded emoji'}
                        style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                      />
                    )}
                  </div>
                  <div className="emoji-meta">
                    <div className="emoji-title">
                      <span className="emoji-label">{entry.kind === 'text' ? 'Emoji' : 'Image emoji'}</span>
                      <span className="emoji-char" aria-hidden="true">
                        {entry.kind === 'text' ? entry.char : (entry.emojiType || 'custom')}
                      </span>
                    </div>
                    <div className="emoji-usage small muted">
                      Usage today: <strong className="usage-strong">{usage}</strong> · {pct}% of total
                    </div>
                  </div>
                </div>

                <div
                  className="usage-bar"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`Popularity of ${label}`}
                >
                  <div className="usage-bar__fill" style={{ width: `${strength}%` }} />
                </div>

                {/* Actions */}
                {entry.kind === 'text' ? (
                  !showingConfirm ? (
                    <div className="emoji-actions">
                      <button
                        className="btn danger"
                        onClick={() => setConfirmTarget(entry.id)}
                        aria-controls={`confirm-${encodeURIComponent(entry.id)}`}
                        aria-expanded="false"
                        disabled={busy || uploadBusy}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      id={`confirm-${encodeURIComponent(entry.id)}`}
                      className="emoji-confirm"
                      role="alertdialog"
                      aria-labelledby={`confirm-title-${encodeURIComponent(entry.id)}`}
                      aria-describedby={`confirm-desc-${encodeURIComponent(entry.id)}`}
                      tabIndex={-1}
                      ref={confirmRef}
                    >
                      <div className="confirm-texts">
                        <div id={`confirm-title-${encodeURIComponent(entry.id)}`} className="small">
                          Remove this emoji?
                        </div>
                        <div id={`confirm-desc-${encodeURIComponent(entry.id)}`} className="muted small">
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
                          onClick={() => onRemove(entry)}
                          disabled={busy}
                        >
                          {busy ? 'Removing…' : 'Confirm remove'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="emoji-actions">
                    <button className="btn" disabled aria-label="Removal not supported for image emojis yet">
                      Remove
                    </button>
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
