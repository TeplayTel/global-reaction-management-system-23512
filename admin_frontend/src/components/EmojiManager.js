import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji, uploadEmojiImage, removeEmojiImage } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager renders the refined Emoji Management UI per latest design notes and style guide.
 * Only required features are included: header actions, library grid with inline card actions,
 * simple tabs, add/upload modal, and a basic pagination/status row. Bulk mode, advanced insights,
 * and list view are intentionally omitted per current scope.
 * @returns {JSX.Element}
 */
export default function EmojiManager() {
  // State
  const [emojis, setEmojis] = useState([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all | active | inactive
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Add/Edit modal state (single modal used for both create and simple edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null => add mode; otherwise holds entry
  const cancelBtnRef = useRef(null);

  // Modal form fields
  const [mode, setMode] = useState('native'); // 'native' | 'upload'
  const [emojiChar, setEmojiChar] = useState('');
  const [emojiName, setEmojiName] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('');
  const [emojiStatus, setEmojiStatus] = useState(true); // active true/false
  const [emojiTags, setEmojiTags] = useState('');
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Simple usage counts for visual parity in cards
  const [counts, setCounts] = useState({});

  // MOCK active/inactive status map derived deterministically from id
  const isActive = (e) => {
    const key = e.id || e.char || e.emojiId || 'k';
    const sum = Array.from(String(key)).reduce((a, c) => a + (c.codePointAt(0) || 0), 0);
    return (sum % 4) !== 0; // ~75% active
  };

  // Normalize mixed list into consistent structure
  const normalizeList = (raw) => {
    const out = [];
    (raw || []).forEach((item) => {
      if (typeof item === 'string') {
        out.push({
          id: `text:${item}`,
          kind: 'text',
          char: item,
          name: item,
          category: 'General',
        });
      } else if (item && typeof item === 'object') {
        const id = item.emojiId || `type:${item.emojiType || 'unknown'}:${item.imageUrl || Math.random()}`;
        out.push({
          id,
          kind: 'image',
          char: null,
          name: item.emojiType || 'custom',
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
    } catch (e) {
      // handled by service; optionally reflect error
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, []);

  // Filtering (status + search)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emojis.filter((e) => {
      const active = isActive(e);
      if (tab === 'active' && !active) return false;
      if (tab === 'inactive' && active) return false;
      if (!q) return true;
      const label = e.kind === 'text' ? e.char : (e.emojiType || e.emojiId || 'image');
      return `${label} ${e.name || ''} ${e.category || ''}`.toLowerCase().includes(q);
    });
  }, [emojis, search, tab]);

  // Pagination (simple, client-side)
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(12);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / rows));
  const pageItems = useMemo(() => {
    const start = (page - 1) * rows;
    return filtered.slice(start, start + rows);
  }, [filtered, page, rows]);

  useEffect(() => {
    // Reset to first page when filter/search changes
    setPage(1);
  }, [search, tab, rows]);

  // Modal helpers
  const openAdd = () => {
    setEditing(null);
    setMode('native');
    setEmojiChar('');
    setEmojiName('');
    setEmojiCategory('');
    setEmojiTags('');
    setEmojiStatus(true);
    setUploadType('');
    setUploadFile(null);
    setModalOpen(true);
    setTimeout(() => cancelBtnRef.current?.focus(), 0);
  };

  const openEdit = (entry) => {
    setEditing(entry);
    setMode(entry.kind === 'text' ? 'native' : 'upload');
    setEmojiChar(entry.kind === 'text' ? entry.char : '');
    setEmojiName(entry.name || (entry.kind === 'text' ? entry.char : (entry.emojiType || 'custom')));
    setEmojiCategory(entry.category || (entry.kind === 'text' ? 'General' : 'Uploaded'));
    setEmojiTags('');
    setEmojiStatus(isActive(entry));
    setUploadType(entry.emojiType || '');
    setUploadFile(null);
    setModalOpen(true);
    setTimeout(() => cancelBtnRef.current?.focus(), 0);
  };

  const closeModal = () => {
    if (busy || uploadBusy) return;
    setModalOpen(false);
    setEditing(null);
  };

  // Save handler for modal (create or simple edit)
  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!editing) {
        // Add flow
        if (mode === 'native') {
          const v = emojiChar.trim();
          if (!v) throw new Error('Please pick or enter an emoji.');
          setBusy(true);
          const updated = await addEmoji(v);
          const normalized = normalizeList(updated);
          setEmojis(normalized);
          ensureCounts(normalized);
        } else {
          if (!uploadType.trim()) throw new Error('Please set a name/type for the emoji.');
          if (!uploadFile) throw new Error('Please choose an image to upload.');
          setUploadBusy(true);
          await uploadEmojiImage(uploadType.trim(), uploadFile);
          await load();
        }
      } else {
        // Simple edit: client-side only (name/category/tags/status). No backend in mock.
        const next = emojis.map((e) => (e.id === editing.id ? { ...e, name: emojiName || e.name, category: emojiCategory || e.category } : e));
        setEmojis(next);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err) {
      setError(err?.message || 'Unable to save emoji.');
    } finally {
      setBusy(false);
      setUploadBusy(false);
    }
  };

  // Remove entry
  const onRemove = async (entry) => {
    setError('');
    setBusy(true);
    try {
      if (entry.kind === 'text') {
        const updated = await removeEmoji(entry.char);
        const normalized = normalizeList(updated);
        setEmojis(normalized);
        ensureCounts(normalized);
      } else {
        const key = entry.emojiId || entry.imageUrl || entry.id;
        const updated = await removeEmojiImage(key);
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

  // KPI basics (Active vs Inactive)
  const kpi = useMemo(() => {
    let active = 0;
    let inactive = 0;
    emojis.forEach((e) => (isActive(e) ? active++ : inactive++));
    return {
      total: emojis.length,
      active,
      inactive,
    };
  }, [emojis]);

  return (
    <div className="emoji-manager">
      {/* Page header */}
      <section className="page-header" aria-label="Emoji management header">
        <div className="page-header__row">
          <div className="page-header__left">
            <div className="icon-chip" aria-hidden="true">😊</div>
            <div className="titles">
              <h2 className="h1">Emoji Management</h2>
              <p className="subtitle">Manage library, categories, and availability</p>
            </div>
          </div>
          <div className="page-header__right">
            <button className="btn ghost" type="button" aria-label="Filters">
              Filters <span className="chev" aria-hidden="true">›</span>
            </button>
            <button className="btn primary" type="button" onClick={openAdd}>
              <span aria-hidden="true" style={{fontWeight:700, marginRight:6}}>+</span>
              Add Emoji
            </button>
          </div>
        </div>
        <div className="divider" />
      </section>

      {/* KPI row */}
      <section className="kpi-grid" aria-label="Emoji metrics">
        <KpiCard title="Total Emojis" value={kpi.total} caption="All library items" ringColor="var(--accent)" />
        <KpiCard title="Active" value={kpi.active} caption="Enabled for use" ringColor="var(--success)" />
        <KpiCard title="Inactive" value={kpi.inactive} caption="Currently disabled" ringColor="var(--text-muted)" />
      </section>

      {/* Library */}
      <section className="card" aria-label="Emoji library">
        <div className="library-header">
          <h3 className="panel-title" style={{margin:0}}>Emoji Library</h3>
          <div className="library-tools">
            <div className="search">
              <span className="search-icon" aria-hidden="true">🔎</span>
              <input
                className="input search-input"
                placeholder="Search emojis"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                aria-label="Search emojis"
              />
            </div>
            <div className="view-toggle" role="tablist" aria-label="Status tabs">
              {['all','active','inactive'].map((t)=>(
                <button
                  key={t}
                  className="icon-btn"
                  aria-selected={tab===t}
                  title={t[0].toUpperCase()+t.slice(1)}
                  onClick={()=>setTab(t)}
                >
                  {t === 'all' ? '≣' : (t === 'active' ? '✓' : '⏸')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs mimic */}
        <div className="tabs" role="tablist" aria-label="Filter tabs">
          {['all','active','inactive'].map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab===t}
              className={`tab-pill ${tab===t ? 'active' : ''}`}
              onClick={()=>setTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error ? (
          <p className="small" role="alert" style={{ color: 'var(--danger)', margin: '4px 0 8px' }}>
            {error}
          </p>
        ) : null}

        {/* Grid */}
        <div className="emoji-grid" role="grid" aria-label="Emoji grid">
          {pageItems.length === 0 ? (
            <div className="empty-state" role="note" aria-live="polite">
              <div className="empty-emoji" aria-hidden="true">🧩</div>
              <div className="empty-text">
                <strong>No emojis found</strong>
                <span className="muted small">Try adjusting your search or filters.</span>
              </div>
            </div>
          ) : (
            pageItems.map((entry) => {
              const active = isActive(entry);
              const usage = counts[entry.id] || 0;
              const statusClass = active ? 'approved' : 'pending';
              const statusLabel = active ? 'ACTIVE' : 'INACTIVE';
              return (
                <article key={entry.id} className="emoji-card" role="gridcell" aria-label={entry.name || entry.id}>
                  <div className="emoji-card__row" style={{justifyContent:'center', position:'relative'}}>
                    <div className="emoji-icon" aria-hidden="true">
                      {entry.kind === 'text' ? (
                        <span className="emoji" aria-hidden="true">{entry.char}</span>
                      ) : (
                        <img
                          src={entry.imageUrl}
                          alt={entry.emojiType ? `${entry.emojiType} emoji` : 'Uploaded emoji'}
                          style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
                        />
                      )}
                    </div>
                    <span className={`status chip ${statusClass}`} style={{ position: 'absolute', right: 0, top: 0 }}>
                      {statusLabel}
                    </span>
                  </div>

                  <div className="center">
                    <div className="emoji-title" style={{justifyContent:'center'}}>
                      <span className="emoji-label">{entry.name || (entry.kind === 'text' ? entry.char : (entry.emojiType || 'custom'))}</span>
                    </div>
                    <div className="small muted">{entry.category || (entry.kind === 'text' ? 'General' : 'Uploaded')}</div>
                  </div>

                  <div className="emoji-footer">
                    <span className="emoji-char" aria-hidden="true" title="Usage count">{Intl.NumberFormat().format(usage)} uses</span>
                    <div className="spacer" />
                    <div className="emoji-actions" role="group" aria-label="Card actions">
                      <button className="btn" title="Edit" onClick={() => openEdit(entry)} disabled={busy || uploadBusy}>Edit</button>
                      <button
                        className="btn danger"
                        title="Delete"
                        onClick={() => onRemove(entry)}
                        disabled={busy || uploadBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="library-header" style={{ marginTop: 12 }}>
          <div className="muted small">
            {total === 0 ? 'Showing 0 of 0' : `Showing ${(page - 1) * rows + 1}–${Math.min(page * rows, total)} of ${total}`}
          </div>
          <div className="library-tools">
            <label className="small" htmlFor="rows">Rows per page</label>
            <select
              id="rows"
              className="input"
              value={rows}
              onChange={(e)=>setRows(Number(e.target.value))}
              style={{ width: 100, height: 32 }}
            >
              {[8,12,16,24].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button className="btn" onClick={()=>setPage(Math.max(1, page-1))} disabled={page<=1} aria-label="Previous page">‹</button>
            <div className="small" aria-live="polite">Page {page} of {totalPages}</div>
            <button className="btn" onClick={()=>setPage(Math.min(totalPages, page+1))} disabled={page>=totalPages} aria-label="Next page">›</button>
          </div>
        </div>
      </section>

      {/* Add/Edit Emoji Modal */}
      {modalOpen ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emoji-modal-title">
            <div className="modal-header">
              <h3 id="emoji-modal-title" className="modal-title">{editing ? 'Edit Emoji' : 'Add Emoji'}</h3>
              <p className="muted small">Provide details and preview before saving.</p>
            </div>

            {/* Source toggle */}
            <div className="segmented" role="tablist" aria-label="Emoji source">
              {['native','upload'].map((m)=>(
                <button key={m} role="tab" aria-selected={mode===m} onClick={()=>setMode(m)} className="small">
                  {m === 'native' ? 'Native' : 'Upload'}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="modal-preview">
              <div className="emoji-icon" aria-hidden="true">
                {mode === 'native' ? (
                  <span className="emoji" style={{ fontSize: 28 }}>{emojiChar || '🙂'}</span>
                ) : (
                  uploadFile ? (
                    <img src={URL.createObjectURL(uploadFile)} alt="Preview" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <span className="muted small">No image chosen</span>
                  )
                )}
              </div>
              <div className="small muted">Live Preview</div>
            </div>

            <form onSubmit={onSave} className="form">
              {mode === 'native' ? (
                <div className="form-inline" style={{ alignItems: 'stretch' }}>
                  <label htmlFor="emoji-char" className="sr-only">Emoji</label>
                  <input id="emoji-char" className="input" placeholder="Enter emoji (e.g., 🔥)" value={emojiChar} onChange={(e)=>setEmojiChar(e.target.value)} />
                </div>
              ) : (
                <div className="form-inline" style={{ alignItems: 'stretch' }}>
                  <label htmlFor="emoji-type" className="sr-only">Name/Type</label>
                  <input id="emoji-type" className="input" placeholder="Name / Type (e.g., fire)" value={uploadType} onChange={(e)=>setUploadType(e.target.value)} style={{ flex: 0.6 }} />
                  <label htmlFor="emoji-file" className="sr-only">Image file</label>
                  <input id="emoji-file" type="file" accept="image/*" onChange={(e)=>setUploadFile(e.target.files?.[0] || null)} />
                </div>
              )}

              <div className="form-inline" style={{ alignItems: 'stretch' }}>
                <label htmlFor="emoji-name" className="sr-only">Name</label>
                <input id="emoji-name" className="input" placeholder="Display name" value={emojiName} onChange={(e)=>setEmojiName(e.target.value)} />
                <label htmlFor="emoji-category" className="sr-only">Category</label>
                <input id="emoji-category" className="input" placeholder="Category" value={emojiCategory} onChange={(e)=>setEmojiCategory(e.target.value)} />
              </div>

              <div className="form-inline" style={{ alignItems: 'center' }}>
                <label htmlFor="emoji-tags" className="sr-only">Tags</label>
                <input id="emoji-tags" className="input" placeholder="Tags (comma-separated)" value={emojiTags} onChange={(e)=>setEmojiTags(e.target.value)} />
                <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={emojiStatus} onChange={(e)=>setEmojiStatus(e.target.checked)} />
                  Active
                </label>
              </div>

              {error ? <p className="small" role="alert" style={{ color: 'var(--danger)' }}>{error}</p> : null}

              <div className="modal-actions">
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

/** Small KPI ring card aligned with style guide */
function KpiCard({ title, value, caption, ringColor }) {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-center">
        <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
          <circle cx="46" cy="46" r="36" stroke="#EEF2F7" strokeWidth="8" fill="none" />
          <circle cx="46" cy="46" r="36" stroke={ringColor} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="226" strokeDashoffset="60" />
        </svg>
        <div className="kpi-number">{value}</div>
      </div>
      <div className="kpi-caption">{caption}</div>
    </div>
  );
}
