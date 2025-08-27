import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addEmoji, getEmojis, removeEmoji, uploadEmojiImage, removeEmojiImage } from '../services/api';

/**
 * PUBLIC_INTERFACE
 * EmojiManager allows admins to add, organize, and moderate emojis with UI parity to the analytics FE.
 * It includes:
 * - Page header (title + subtitle + actions)
 * - KPI metric cards row
 * - Library toolbar (search/filter/view toggle) and tabs
 * - Emoji grid with status chips and actions
 * - Add/Upload forms and confirmation modal
 * @returns {JSX.Element}
 */
export default function EmojiManager() {
  // Unified emoji entries
  const [emojis, setEmojis] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState('');
  const [counts, setCounts] = useState({});

  // Confirmation modal state
  const [confirmEntry, setConfirmEntry] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const confirmCancelRef = useRef(null);

  // Upload form
  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  // Library UI state
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all'); // all | approved | pending | rejected
  const [view, setView] = useState('grid'); // grid | list (list not implemented, but toggle included)

  // Fake moderation statuses for visual variety (mock)
  const statusFor = (e) => {
    const key = e.id || e.char || e.emojiId || 'x';
    const h = Array.from(String(key)).reduce((a, c) => a + (c.codePointAt(0) || 0), 0);
    const r = h % 100;
    if (r < 70) return 'approved';
    if (r < 85) return 'pending';
    return 'rejected';
  };

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

  // Seed deterministic-ish usage count
  const seedCount = (entry) => {
    if (!entry) return 0;
    const source = entry.kind === 'text' ? entry.char : (entry.emojiType || entry.id || 'image');
    const codePoints = Array.from(source).map((c) => c.codePointAt(0) || 0);
    const base = codePoints.reduce((a, b) => a + b, 0);
    const rand = Math.floor((Math.sin(base) + 1) * 25);
    return Math.max(5, base % 100) + rand;
  };

  const ensureCounts = (list) => {
    setCounts((prev) => {
      const updated = { ...prev };
      for (const e of list) {
        if (updated[e.id] == null) updated[e.id] = seedCount(e);
      }
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
    } catch {
      // handled in service
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live-ish usage changes
  useEffect(() => {
    const tick = setInterval(() => {
      setCounts((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          const delta = Math.floor(Math.random() * 7) - 3;
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
      await load();
      setUploadType('');
      setUploadFile(null);
      if (e.target && e.target.reset) e.target.reset();
    } catch (err) {
      setError(err?.message || 'Unable to upload emoji image.');
    } finally {
      setUploadBusy(false);
    }
  };

  // Aggregates for KPI and usage bars
  const { totalCount, maxCount } = useMemo(() => {
    const vals = emojis.map((e) => counts[e.id] || 0);
    const sum = vals.reduce((a, b) => a + b, 0);
    const max = vals.reduce((a, b) => Math.max(a, b), 0);
    return { totalCount: sum, maxCount: max };
  }, [counts, emojis]);

  const openConfirmFor = (entry) => {
    setConfirmEntry(entry);
    setModalOpen(true);
  };

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape' && modalOpen && !busy) {
        setModalOpen(false);
        setConfirmEntry(null);
      }
    };
    if (modalOpen) {
      document.addEventListener('keydown', onKey);
      setTimeout(() => {
        if (confirmCancelRef.current) confirmCancelRef.current.focus();
      }, 0);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen, busy]);

  // Filtering and tab projection (mock statuses)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return emojis.filter((e) => {
      const label = e.kind === 'text' ? e.char : (e.emojiType || e.emojiId || 'image');
      const status = statusFor(e);
      if (tab !== 'all' && status !== tab) return false;
      if (!q) return true;
      return String(label).toLowerCase().includes(q);
    });
  }, [search, tab, emojis]);

  // KPIs derived from statuses
  const kpi = useMemo(() => {
    const all = emojis.length;
    let approved = 0, pending = 0, rejected = 0;
    emojis.forEach((e) => {
      const s = statusFor(e);
      if (s === 'approved') approved++;
      else if (s === 'pending') pending++;
      else rejected++;
    });
    return {
      total: all,
      approved,
      rejected,
      pending,
      approvalRate: all ? Math.round((approved / all) * 100) : 0,
    };
  }, [emojis]);

  return (
    <div className="emoji-manager">
      {/* Page header, aligned with analytics FE guidance */}
      <section className="page-header" aria-label="Emoji management header">
        <div className="page-header__row">
          <div className="page-header__left">
            <div className="icon-chip" aria-hidden="true">😊</div>
            <div className="titles">
              <h2 className="h1">Emoji Management</h2>
              <p className="subtitle">
                Create, organize, and moderate emoji assets used in polls.
              </p>
            </div>
          </div>
          <div className="page-header__right">
            <button className="btn ghost" type="button" aria-label="Filters">
              Filters
              <span className="chev" aria-hidden="true">›</span>
            </button>
            <a className="btn primary" href="#add" onClick={(e)=>{e.preventDefault(); const el=document.getElementById('add-emoji-title'); if(el) el.scrollIntoView({behavior:'smooth', block:'center'});}}>
              <span aria-hidden="true" style={{fontWeight:700, marginRight:6}}>+</span>
              New Emoji
            </a>
          </div>
        </div>
        <div className="divider" />
      </section>

      {/* KPI row (metrics) */}
      <section className="kpi-grid" aria-label="Emoji metrics">
        <KpiCard title="Total Emojis" value={kpi.total} caption="All library items" ringColor="var(--accent)" />
        <KpiCard title="Approved Emojis" value={kpi.approved} caption="Ready for use" ringColor="var(--success)" />
        <KpiCard title="Rejected Emojis" value={kpi.rejected} caption="Archived or denied" ringColor="var(--danger)" />
        <KpiCard title="Pending Review" value={kpi.pending} caption="Awaiting moderation" ringColor="var(--warning)" />
      </section>

      {/* Library panel header/toolbar */}
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
            <button className="btn" type="button" aria-label="Filter">
              Filter <span className="chev" aria-hidden="true">›</span>
            </button>
            <div className="view-toggle" role="tablist" aria-label="View toggle">
              <button
                className="icon-btn"
                aria-selected={view==='grid'}
                title="Grid view"
                onClick={()=>setView('grid')}
              >▦</button>
              <button
                className="icon-btn"
                aria-selected={view==='list'}
                title="List view"
                onClick={()=>setView('list')}
              >≣</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs" role="tablist" aria-label="Library filters">
          {['all','approved','pending','rejected'].map(t => (
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

        {/* Add section (forms) */}
        <section
          className="add-card"
          aria-labelledby="add-emoji-title"
          id="add"
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

        {/* Emoji grid/list */}
        <div className={view==='grid' ? 'emoji-grid kpi-spacing' : 'emoji-list'} role="list" aria-label="Current emoji list">
          {filtered.length === 0 ? (
            <div className="empty-state" role="note" aria-live="polite">
              <div className="empty-emoji" aria-hidden="true">🧩</div>
              <div className="empty-text">
                <strong>No emojis found</strong>
                <span className="muted small">Try adjusting your search or filters.</span>
              </div>
            </div>
          ) : (
            filtered.map((entry) => {
              const usage = counts[entry.id] || 0;
              const pct = totalCount > 0 ? Math.round((usage / totalCount) * 100) : 0;
              const strength = maxCount > 0 ? Math.max(8, Math.round((usage / maxCount) * 100)) : 0;
              const label = entry.kind === 'text'
                ? `Emoji ${entry.char}`
                : `Emoji ${entry.emojiType || entry.emojiId || 'image'}`;
              const st = statusFor(entry);

              return (
                <article
                  key={entry.id}
                  className="emoji-card"
                  role="listitem"
                  aria-label={label}
                >
                  <div className="emoji-card__row" style={{justifyContent:'center'}}>
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
                  </div>
                  <div className="center">
                    <div className="emoji-title" style={{justifyContent:'center'}}>
                      <span className="emoji-label">{entry.kind === 'text' ? 'Emoji' : 'Image emoji'}</span>
                    </div>
                    <div className="emoji-name">{entry.kind === 'text' ? entry.char : (entry.emojiType || 'custom')}</div>
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

                  <div className="emoji-footer">
                    <StatusChip status={st} />
                    <div className="spacer" />
                    <div className="emoji-actions">
                      <button
                        className="btn danger"
                        onClick={() => openConfirmFor(entry)}
                        disabled={busy || uploadBusy}
                        title="Remove emoji"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

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

/** Status chip per analytics FE color tokens */
function StatusChip({ status }) {
  const label = status === 'approved' ? 'APPROVED' : status === 'pending' ? 'PENDING' : 'REJECTED';
  const cls = `status chip ${status}`;
  return <span className={cls} role="status" aria-label={`Status ${label}`}>{label}</span>;
}
