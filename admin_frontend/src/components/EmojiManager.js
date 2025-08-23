import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji, uploadEmojiImage, removeEmojiImage } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager allows admins to add or remove emojis that appear in the user app.
 * Enhanced to support uploading image-based emojis with multipart/form-data.
 * Renders a detailed card/grid layout, per-emoji usage stat, and a global confirmation modal
 * when removing any emoji (Unicode or image-based).
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
  const [counts, setCounts] = useState({}); // per-emoji usage count (frontend simulated)

  // Confirmation modal state
  const [confirmEntry, setConfirmEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const confirmCancelRef = useRef(null);

  // Upload form state
  const [uploadType, setUploadType] = useState(''); // new: type/category label
  const [uploadFile, setUploadFile] = useState(null); // new: image file

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

  const onConfirmRemove = async () => {
    if (!confirmEntry) return;
    setBusy(true);
    setError('');
    try {
      if (confirmEntry.kind === 'text') {
        const updated = await removeEmoji(confirmEntry.char);
        const normalized = normalizeList(updated);
        setEmojis(normalized);
        ensureCounts(normalized);
      } else {
        const key = confirmEntry.emojiId || confirmEntry.imageUrl || confirmEntry.id;
        const updated = await removeEmojiImage(key);
        const normalized = normalizeList(updated);
        setEmojis(normalized);
        ensureCounts(normalized);
      }
    } catch (err) {
      setError(err?.message || 'Unable to remove emoji.');
    } finally {
      setBusy(false);
      setModalOpen(false);
      setConfirmEntry(null);
    }
  };

  const onUpload = async (e) => {
    e.preventDefault();
    setError('');
    if (!uploadType.trim()) {
      setError('Please enter a type/label for the emoji (e.g., "fire").');
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
      // Best effort to clear file input
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

  // Open confirmation modal for an entry
  const openConfirmFor = (entry) => {
    setConfirmEntry(entry);
    setModalOpen(true);
  };

  // Accessibility: close modal with Escape key and set focus to Cancel on open
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape' && modalOpen && !busy) {
        setModalOpen(false);
        setConfirmEntry(null);
      }
    };
    if (modalOpen) {
      document.addEventListener('keydown', onKey);
      // slight timeout to ensure element exists
      setTimeout(() => {
        if (confirmCancelRef.current) confirmCancelRef.current.focus();
      }, 0);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, busy]);

  return (
    <div className="emoji-manager">
      <h2 className="panel-title">Emojis</h2>

      {/* Add section */}
      <section
        className="add-card"
        aria-labelledby="add-emoji-title"
      >
        <div className="add-card__header">
          <div>
            <h3 id="add-emoji-title" className="add-card__title">Add emoji</h3>
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
          <label htmlFor="emoji-type" className="sr-only">Emoji Type (label/category)</label>
          <input
            id="emoji-type"
            className="input"
            placeholder="Emoji Type (e.g., fire, clap, star)"
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value)}
            aria-label="Emoji type"
            disabled={busy || uploadBusy}
            style={{ flex: 0.6 }}
          />
          <label htmlFor="emoji-file" className="sr-only">Emoji Image Upload</label>
          <input
            id="emoji-file"
            type="file"
            accept="image/*"
            aria-label="Emoji image upload"
            onChange={(e) => setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
            disabled={busy || uploadBusy}
            style={{ color: 'var(--text-secondary)' }}
          />
          <button className="btn" type="submit" disabled={busy || uploadBusy}>
            {uploadBusy ? 'Uploading…' : 'Upload image'}
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
          emojis.map((entry) => {
            const usage = counts[entry.id] || 0;
            const pct = totalCount > 0 ? Math.round((usage / totalCount) * 100) : 0;
            const strength = maxCount > 0 ? Math.max(8, Math.round((usage / maxCount) * 100)) : 0;

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
                <div className="emoji-actions">
                  <button
                    className="btn danger"
                    onClick={() => openConfirmFor(entry)}
                    disabled={busy || uploadBusy}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {modalOpen && confirmEntry ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) {
              setModalOpen(false);
              setConfirmEntry(null);
            }
          }}
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="remove-emoji-title"
            aria-describedby="remove-emoji-desc"
          >
            <div className="modal-header">
              <h3 id="remove-emoji-title" className="modal-title">Remove this emoji?</h3>
              <p id="remove-emoji-desc" className="muted small">
                {confirmEntry.kind === 'text'
                  ? `You are about to remove the emoji ${confirmEntry.char}. This action takes effect immediately for all viewers.`
                  : `You are about to remove the ${confirmEntry.emojiType || 'custom'} image emoji. This action takes effect immediately for all viewers.`}
              </p>
            </div>

            <div className="modal-preview">
              <div className="emoji-icon" aria-hidden="true">
                {confirmEntry.kind === 'text' ? (
                  <span className="emoji">{confirmEntry.char}</span>
                ) : (
                  <img
                    src={confirmEntry.imageUrl}
                    alt={confirmEntry.emojiType ? `${confirmEntry.emojiType} emoji` : 'Uploaded emoji'}
                    style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                  />
                )}
              </div>
              <span className="emoji-char" aria-hidden="true" style={{ marginLeft: 8 }}>
                {confirmEntry.kind === 'text' ? confirmEntry.char : (confirmEntry.emojiType || 'custom')}
              </span>
            </div>

            <div className="modal-actions">
              <button
                ref={confirmCancelRef}
                className="btn"
                onClick={() => {
                  if (busy) return;
                  setModalOpen(false);
                  setConfirmEntry(null);
                }}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="btn danger"
                onClick={onConfirmRemove}
                disabled={busy}
              >
                {busy ? 'Removing…' : 'Confirm remove'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
