import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getEmojis, removeEmoji, uploadEmojiImage, removeEmojiImage } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager presents a simplified Emoji Management UI with refined card visuals.
 * Edit functionality is removed; each card shows a single emoji with its actual name.
 * @returns {JSX.Element}
 */
export default function EmojiManager() {
  // State
  const [emojis, setEmojis] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Add modal state
  const [modalOpen, setModalOpen] = useState(false);
  const cancelBtnRef = useRef(null);

  // Modal fields (Upload + Name only)
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Simple usage counts for visual parity in cards
  const [counts, setCounts] = useState({});

  // Normalize mixed list into consistent structure
  const normalizeList = (raw) => {
    const out = [];
    (raw || []).forEach((item) => {
      if (typeof item === 'string') {
        // Single native emoji only
        out.push({
          id: `text:${item}`,
          kind: 'text',
          char: item,
          name: item,        // show actual emoji char as name by default
          category: 'General',
        });
      } else if (item && typeof item === 'object') {
        const id = item.emojiId || `type:${item.emojiType || 'unknown'}:${item.imageUrl || Math.random()}`;
        out.push({
          id,
          kind: 'image',
          char: null,
          name: item.emojiType || 'custom', // display actual emoji name/type, no generic "general"
          category: 'Uploaded',
          ...item,
        });
      }
    });
    return out;
  };

  const seedCount = (entry) => {
    const src = entry.kind === 'text' ? entry.char : (entry.emojiType || entry.id || 'x');
    const base = Array.from(String(src)).reduce((a, c) => a + (c.codePointAt(0) || 0), 0);
    return 50 + (base % 950); // 50..999
  };

  const ensureCounts = (list) => {
    setCounts((prev) => {
      const next = { ...prev };
      list.forEach((e) => {
        if (next[e.id] == null) next[e.id] = seedCount(e);
      });
      Object.keys(next).forEach((k) => {
        if (!list.some((e) => e.id === k)) delete next[k];
      });
      return next;
    });
  };

  const load = async () => {
    try {
      const list = await getEmojis();
      const normalized = normalizeList(list);
      setEmojis(normalized);
      ensureCounts(normalized);
    } catch {
      // handled by service
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  // Simplified filtering: search only
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return emojis;
    return emojis.filter((e) => {
      const label = e.kind === 'text' ? e.char : (e.emojiType || e.emojiId || 'image');
      // ensure name is part of search terms
      return `${label} ${e.name || ''} ${e.category || ''}`.toLowerCase().includes(q);
    });
  }, [emojis, search]);

  // Modal helpers
  const openAdd = () => {
    setUploadName('');
    setUploadFile(null);
    setModalOpen(true);
    setTimeout(() => cancelBtnRef.current?.focus(), 0);
  };

  const closeModal = () => {
    if (busy || uploadBusy) return;
    setModalOpen(false);
  };

  // Save handler (Upload only with Name)
  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!uploadName.trim()) throw new Error('Please enter a name for the emoji.');
      if (!uploadFile) throw new Error('Please choose an image to upload.');
      setUploadBusy(true);
      await uploadEmojiImage(uploadName.trim(), uploadFile);
      await load();
      setModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Unable to save emoji.');
    } finally {
      setBusy(false);
      setUploadBusy(false);
    }
  };

  // Remove entry (kept per requirements; edit functionality removed)
  const onRemove = async (entry) => {
    setError('');
    setBusy(true);
    try {
      if (entry.kind === 'text') {
        const { removeEmoji: removeTextEmoji } = await import('../services/api');
        const updated = await removeTextEmoji(entry.char);
        const normalized = normalizeList(updated);
        setEmojis(normalized);
        ensureCounts(normalized);
      } else {
        // Prefer stable identifiers: emojiId, then emojiType, then fallback to id
        const identifier = entry.emojiId || entry.emojiType || entry.id;
        const updated = await removeEmojiImage(identifier);
        const normalized = normalizeList(updated);
        setEmojis(normalized);
        ensureCounts(normalized);
      }
    } catch (err) {
      setError(err?.message || 'Unable to delete emoji.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="emoji-manager">
      {/* Page header */}
      <section className="page-header" aria-label="Emoji management header">
        <div className="page-header__row">
          <div className="page-header__left">
            <div className="icon-chip" aria-hidden="true">😊</div>
            <div className="titles">
              <h2 className="h1">Emoji Management</h2>
              <p className="subtitle">Manage library and uploads</p>
            </div>
          </div>
          <div className="page-header__right" style={{ gap: '12px' }}>
            <button className="btn primary" type="button" onClick={openAdd} style={{ marginLeft: '4px' }}>
              <span aria-hidden="true" style={{fontWeight:700, marginRight:6}}>+</span>
              Add Emoji
            </button>
          </div>
        </div>
        <div className="divider" />
      </section>

      {/* Library */}
      <section className="card" aria-label="Emoji library">
        <div className="library-header">
          <h3 className="panel-title" style={{margin:0}}>Emoji Library</h3>
          <div className="library-tools" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <div className="search" style={{ minWidth: 240 }}>
              <span className="search-icon" aria-hidden="true">🔎</span>
              <input
                className="input search-input"
                placeholder="Search emojis"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                aria-label="Search emojis"
                style={{
                  height: 40,
                  paddingLeft: 36,
                  background: '#F8FAFC',
                  borderColor: 'var(--stroke-soft)',
                  boxShadow: 'inset 0 1px 0 rgba(15,23,42,0.03)'
                }}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="small" role="alert" style={{ color: 'var(--danger)', margin: '4px 0 8px' }}>
            {error}
          </p>
        ) : null}

        {/* Grid */}
        <div className="emoji-grid" role="grid" aria-label="Emoji grid">
          {filtered.length === 0 ? (
            <div className="empty-state" role="note" aria-live="polite">
              <div className="empty-emoji" aria-hidden="true">🧩</div>
              <div className="empty-text">
                <strong>No emojis found</strong>
                <span className="muted small">Try adjusting your search.</span>
              </div>
            </div>
          ) : (
            filtered.map((entry) => {
              const usage = counts[entry.id] || 0;
              // Always show a single emoji in the preview box
              return (
                <article key={entry.id} className="emoji-card" role="gridcell" aria-label={entry.name || entry.id}>
                  <div className="emoji-card__row" style={{justifyContent:'center', position:'relative'}}>
                    <div className="emoji-icon" aria-hidden="true" title={entry.name}>
                      {entry.kind === 'text' ? (
                        <span className="emoji" aria-hidden="true">{entry.char}</span>
                      ) : (
                        <img
                          src={entry.imageUrl || `${process.env.REACT_APP_API_BASE_URL || ''}/emoji/${encodeURIComponent(entry.emojiType || '')}.png`}
                          alt={entry.emojiType ? `${entry.emojiType} emoji` : 'Uploaded emoji'}
                          style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    {/* Subtle status pill removed for cleaner UI per refinement; can re-add if needed */}
                  </div>

                  <div className="center">
                    {/* Display precise emoji name, not a generic label */}
                    <div className="emoji-name">{entry.emojiType || entry.name}</div>
                    <div className="small muted">{entry.category || (entry.kind === 'text' ? 'General' : 'Uploaded')}</div>
                  </div>

                  <div className="emoji-footer" style={{ gap: '10px' }}>
                    <span className="emoji-char" aria-hidden="true" title="Usage count">
                      {Intl.NumberFormat().format(usage)} uses
                    </span>
                    <div className="spacer" />
                    {/* Edit removed entirely as requested */}
                    <button
                      className="btn danger"
                      title="Delete"
                      onClick={() => onRemove(entry)}
                      disabled={busy || uploadBusy}
                      aria-label={`Delete ${entry.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      {/* Add Emoji Modal (Upload + Name only) */}
      {modalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emoji-modal-title">
            <div className="modal-header">
              <h3 id="emoji-modal-title" className="modal-title">Add Emoji</h3>
              <p className="muted small">Upload an image and give it a name.</p>
            </div>

            {/* Single upload section with live preview */}
            <div className="modal-preview">
              <div className={`preview-box ${uploadFile ? 'has-image' : 'is-empty'}`} aria-hidden={!!uploadFile}>
                {uploadFile ? (
                  <img
                    src={URL.createObjectURL(uploadFile)}
                    alt="Preview"
                    className="preview-img"
                  />
                ) : (
                  <div className="preview-placeholder" aria-hidden="true">
                    <div className="preview-placeholder__icon" title="Preview icon">🖼️</div>
                  </div>
                )}
              </div>
              <div className="small muted">Live Preview</div>
            </div>

            <form onSubmit={onSave} className="form" style={{ display: 'grid', gap: 10 }}>
              <div className="form-inline" style={{ alignItems: 'stretch' }}>
                <label htmlFor="emoji-name" className="sr-only">Name</label>
                <input
                  id="emoji-name"
                  className="input"
                  placeholder="Name (e.g., fire)"
                  value={uploadName}
                  onChange={(e)=>setUploadName(e.target.value)}
                />
              </div>

              {/* File upload control styled to avoid native "No file chosen" overlap */}
              <div className="upload-row">
                <div className="upload-drop" role="group" aria-label="Upload emoji image">
                  <div className="upload-left">
                    <div className="upload-icon" aria-hidden="true">🖼️</div>
                    <div className="upload-text">
                      <div className="upload-title">Upload image</div>
                      <div className="upload-subtitle">PNG/SVG recommended 128×128</div>
                    </div>
                  </div>
                  <div className="upload-right">
                    <label
                      htmlFor="emoji-file"
                      className="upload-choose-btn"
                      role="button"
                      aria-label="Choose an image file to upload"
                    >
                      Choose file
                    </label>
                    <input
                      id="emoji-file"
                      type="file"
                      accept="image/*"
                      className="upload-input"
                      onChange={(e)=>setUploadFile(e.target.files?.[0] || null)}
                    />
                    <div
                      className={`upload-filename small ${uploadFile ? '' : 'is-placeholder'}`}
                      aria-live="polite"
                    >
                      {uploadFile ? uploadFile.name : 'No image selected'}
                    </div>
                  </div>
                </div>
              </div>

              {error ? <p className="small" role="alert" style={{ color: 'var(--danger)' }}>{error}</p> : null}

              <div className="modal-actions" style={{ gap: '10px' }}>
                <button ref={cancelBtnRef} type="button" className="btn" onClick={closeModal}>Cancel</button>
                <button className="btn primary" type="submit" disabled={busy || uploadBusy}>
                  {(busy || uploadBusy) ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
