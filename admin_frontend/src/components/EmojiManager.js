import React, { useEffect, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji } from '../services/api';

/**
 * EmojiManager allows admins to add or remove emojis that appear in the user app.
 * PUBLIC_INTERFACE
 * @returns JSX.Element
 */
export default function EmojiManager() {
  const [emojis, setEmojis] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const list = await getEmojis();
      setEmojis(list);
    } catch (e) {
      // handled in service, no-op
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // "real-time" updates via polling
    return () => clearInterval(t);
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
    } catch (err) {
      setError(err?.message || 'Unable to remove emoji.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="emoji-manager">
      <h2 className="panel-title">Emoji Management</h2>
      <p className="muted small">Add or remove emojis available to viewers. Changes are live.</p>

      <form className="form-inline" onSubmit={onAdd}>
        <input
          className="input"
          placeholder="Type or paste an emoji (e.g., 🔥)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Emoji input"
          disabled={busy}
        />
        <button className="btn primary" type="submit" disabled={busy}>Add</button>
      </form>

      {error ? <p className="small" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p> : null}

      <div className="emoji-list" role="list" aria-label="Current emoji list">
        {emojis.length === 0 ? (
          <p className="muted small">No emojis configured.</p>
        ) : emojis.map(e => (
          <div key={e} className="emoji-chip" role="listitem" aria-label={`Emoji ${e}`}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>{e}</span>
            <button
              onClick={() => onRemove(e)}
              aria-label={`Remove ${e}`}
              title="Remove"
              disabled={busy}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
