 /**
 * API service for the admin frontend.
 * Uses REACT_APP_API_BASE_URL if provided; otherwise falls back to mock data for analytics only.
 */

const BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const IS_MOCK = !BASE_URL;
const AUTH_TOKEN = process.env.REACT_APP_ADMIN_TOKEN || '';

/**
 * Build Authorization headers if token exists.
 */
function authHeaders() {
  const headers = {};
  if (AUTH_TOKEN) headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  return headers;
}

// PUBLIC_INTERFACE
export async function getEmojis() {
  /**
   * Fetch current emoji list from backend.
   * Returns array of uploaded image emoji objects: { emojiId, emojiType, imageUrl }
   *
   * Contract:
   * - GET {BASE_URL}/fan-engagement/emoji/v1/list -> [{ emojiId, emojiType }, ...]
   * - Each image URL resolved via: {BASE_URL}/emoji/{emojiType}.png
   *
   * Note:
   * - Static/native (unicode) emojis are no longer seeded locally. The UI is 100% driven by API.
   */
  const list = await safeFetch(`${BASE_URL}/fan-engagement/emoji/v1/list`, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
    },
  });

  const mapped = (Array.isArray(list) ? list : []).map((it) => {
    const emojiType = it.emojiType || it.type || it.name;
    const imageUrl = `${BASE_URL}/emoji/${encodeURIComponent(emojiType)}.png`;
    return {
      emojiId: it.emojiId || it.id || emojiType,
      emojiType,
      imageUrl,
    };
  });
  return mapped;
}

// PUBLIC_INTERFACE
export async function removeEmojiImage(identifier) {
  /**
   * Remove an uploaded image-based emoji by emojiId or emojiType.
   * DELETE /fan-engagement/emoji/v1/{identifier}
   */
  if (!identifier) throw new Error('emoji identifier is required.');
  const url = `${BASE_URL}/fan-engagement/emoji/v1/${encodeURIComponent(identifier)}`;
  const res = await safeFetch(url, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  return res;
}

// PUBLIC_INTERFACE
export async function getAnalytics(params = {}) {
  /**
   * Fetch analytics data.
   * Integrates with /fan-engagement/emoji/v1/stats
   * Accepts optional query params: eventId, userId, pageNo, pageSize
   * Returns normalized array of { label, teamRed, teamBlue }
   */
  if (IS_MOCK) {
    // randomize a bit to simulate "live" analytics (analytics-only mock)
    return mockState.stats.map((s) => randomizeStat(s));
  }

  const qp = new URLSearchParams();
  ['eventId', 'userId', 'pageNo', 'pageSize'].forEach((k) => {
    if (params[k] != null && params[k] !== '') qp.set(k, String(params[k]));
  });
  const url = `${BASE_URL}/fan-engagement/emoji/v1/stats${qp.toString() ? `?${qp.toString()}` : ''}`;

  const data = await safeFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  if (Array.isArray(data)) {
    return data.map((item) => ({
      label: item.label || item.metric || 'Metric',
      teamRed: Number(item.teamRed ?? item.red ?? 0),
      teamBlue: Number(item.teamBlue ?? item.blue ?? 0),
    }));
  }
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return data.items.map((item) => ({
      label: item.label || item.metric || 'Metric',
      teamRed: Number(item.teamRed ?? item.red ?? 0),
      teamBlue: Number(item.teamBlue ?? item.blue ?? 0),
    }));
  }
  return [];
}

/**
 * Internal helper to apply a timeout to fetch to avoid "stuck/pending" requests in dev.
 * @param {RequestInfo} url
 * @param {RequestInit} options
 * @param {number} ms timeout in milliseconds
 */
async function fetchWithTimeout(url, options, ms = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

// PUBLIC_INTERFACE
export async function uploadEmojiImage(emojiType, emojiImageFile) {
  /**
   * Upload a new image-based emoji using multipart/form-data.
   * Fields: emojiType, emojiImage
   * Endpoint: POST /fan-engagement/emoji/v1/upload
   *
   * Notes:
   * - Do NOT set Content-Type manually for multipart; let the browser set boundary.
   * - Include Authorization if token present.
   * - Add Accept: application/json to help some backends choose response serializer.
   * - Apply a fetch timeout to surface hanging-dev-server issues.
   */
  if (!emojiType) throw new Error('emojiType is required.');
  if (!emojiImageFile) throw new Error('emojiImage (file) is required.');

  const fd = new FormData();
  fd.append('emojiType', emojiType);
  // If backend expects a filename field, pass through the original name
  fd.append('emojiImage', emojiImageFile, emojiImageFile.name || 'emoji.png');

  // Build headers; do not set Content-Type explicitly for FormData
  const headers = {
    ...authHeaders(),
    Accept: 'application/json',
  };

  let r;
  try {
    r = await fetchWithTimeout(`${BASE_URL}/fan-engagement/emoji/v1/upload`, {
      method: 'POST',
      headers,
      body: fd,
      // credentials omitted by default; if BE needs cookies, set credentials:'include'
    }, 25000);
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Upload timed out. Please check backend availability and CORS.');
    }
    throw e;
  }

  // Try to parse error body for more helpful messages
  if (!r.ok) {
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const errJson = await r.json().catch(() => ({}));
      const message = errJson?.message || errJson?.error || `Request failed: ${r.status}`;
      throw new Error(message);
    } else {
      const txt = await r.text().catch(() => '');
      const message = txt || `Request failed: ${r.status}`;
      throw new Error(message);
    }
  }

  // Success path
  const contentType = r.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await r.json().catch(() => ({}));
    return data;
  }
  // If BE returns no content or other type, return basic ack
  return { ok: true, status: r.status };
}

async function safeFetch(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  const contentType = r.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await r.json().catch(() => ({}));
    return data;
  }
  return await r.json().catch(() => ({}));
}

/** Minimal mock (analytics only) to keep local page rendering consistent without backend */
let mockState = {
  stats: [
    { label: 'Positive', teamRed: 62, teamBlue: 38 },
    { label: 'Excited', teamRed: 54, teamBlue: 46 },
    { label: 'Neutral', teamRed: 40, teamBlue: 60 },
    { label: 'Negative', teamRed: 35, teamBlue: 65 },
    { label: 'Surprised', teamRed: 58, teamBlue: 42 },
  ],
};

function randomizeStat(s) {
  const delta = Math.random() * 6 - 3;
  let r = Math.max(0, Math.min(100, Math.round(s.teamRed + delta)));
  let b = 100 - r;
  return { ...s, teamRed: r, teamBlue: b };
}
