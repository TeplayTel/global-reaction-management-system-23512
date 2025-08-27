/**
 * API service for the admin frontend.
 * Uses REACT_APP_API_BASE_URL if provided; otherwise falls back to mock data.
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
  /** Fetch current emoji list from backend or return mock data.
   * Returns a heterogeneous list that can contain:
   * - plain Unicode emoji strings
   * - uploaded image emoji objects: { emojiId, emojiType, imageUrl }
   *
   * Backend integration expectations:
   * - A list endpoint is expected at GET {BASE_URL}/fan-engagement/emoji/v1/list
   *   returning: [{ emojiId, emojiType }, ...]
   * - Each image can be resolved to an image URL via:
   *   {BASE_URL}/emoji/{emojiType}.png
   */
  if (IS_MOCK) {
    // Merge text and image-based emojis for the mock
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }

  // Try to fetch structured list
  try {
    const list = await safeFetch(`${BASE_URL}/fan-engagement/emoji/v1/list`, {
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json',
      },
    });

    // Map to include imageUrl per provided pattern
    const mapped = (Array.isArray(list) ? list : []).map(it => {
      const emojiType = it.emojiType || it.type || it.name;
      const imageUrl = `${BASE_URL}/emoji/${encodeURIComponent(emojiType)}.png`;
      return {
        emojiId: it.emojiId || it.id || emojiType,
        emojiType,
        imageUrl,
      };
    });
    return mapped;
  } catch (e) {
    // As a fallback, attempt a generic endpoint if available
    const res = await safeFetch(`${BASE_URL}/emojis`, {
      headers: { ...authHeaders() },
    });
    return Array.isArray(res) ? res : [];
  }
}

// PUBLIC_INTERFACE
export async function addEmoji(emoji) {
  /** Add a new native (unicode) emoji to the list (mock only unless backend supports). */
  if (IS_MOCK) {
    if (!emoji) throw new Error('Emoji is required.');
    if (!mockState.emojis.includes(emoji)) {
      mockState.emojis.push(emoji);
      notify();
    }
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }
  const res = await safeFetch(`${BASE_URL}/emojis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ emoji }),
  });
  return res;
}

// PUBLIC_INTERFACE
export async function removeEmoji(emoji) {
  /** Remove a native Unicode emoji (mock or generic backend). */
  if (IS_MOCK) {
    mockState.emojis = mockState.emojis.filter(e => e !== emoji);
    notify();
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }
  const res = await safeFetch(`${BASE_URL}/emojis/${encodeURIComponent(emoji)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  return res;
}

// PUBLIC_INTERFACE
export async function removeEmojiImage(identifier) {
  /** Remove an uploaded image-based emoji from the list.
   * identifier: emojiId or emojiType
   */
  if (!identifier) throw new Error('emoji identifier is required.');
  if (IS_MOCK) {
    const input = String(identifier);
    mockState.emojiImages = mockState.emojiImages.filter(
      obj => obj.emojiId !== input && obj.emojiType !== input && obj.imageUrl !== input
    );
    notify();
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }

  // Prefer deleting by emojiId if provided; otherwise try by type
  const url = `${BASE_URL}/fan-engagement/emoji/v1/${encodeURIComponent(identifier)}`;
  const res = await safeFetch(url, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  return res;
}

// PUBLIC_INTERFACE
export async function getAnalytics(params = {}) {
  /** Fetch analytics data.
   * Integrates with /fan-engagement/emoji/v1/stats
   * Accepts optional query params: eventId, userId, pageNo, pageSize
   * Returns normalized array of { label, teamRed, teamBlue }
   */
  if (IS_MOCK) {
    // randomize a bit to simulate "live" analytics
    return mockState.stats.map(s => randomizeStat(s));
  }

  const qp = new URLSearchParams();
  ['eventId', 'userId', 'pageNo', 'pageSize'].forEach(k => {
    if (params[k] != null && params[k] !== '') qp.set(k, String(params[k]));
  });
  const url = `${BASE_URL}/fan-engagement/emoji/v1/stats${qp.toString() ? `?${qp.toString()}` : ''}`;

  const data = await safeFetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });

  // Normalize expected structure
  if (Array.isArray(data)) {
    return data.map(item => ({
      label: item.label || item.metric || 'Metric',
      teamRed: Number(item.teamRed ?? item.red ?? 0),
      teamBlue: Number(item.teamBlue ?? item.blue ?? 0),
    }));
  }
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return data.items.map(item => ({
      label: item.label || item.metric || 'Metric',
      teamRed: Number(item.teamRed ?? item.red ?? 0),
      teamBlue: Number(item.teamBlue ?? item.blue ?? 0),
    }));
  }
  return [];
}

// PUBLIC_INTERFACE
export async function uploadEmojiImage(emojiType, emojiImageFile) {
  /** Upload a new image-based emoji using multipart/form-data.
   * Fields: emojiType, emojiImage
   * Endpoint: POST /fan-engagement/emoji/v1/upload
   */
  if (!emojiType) throw new Error('emojiType is required.');
  if (!emojiImageFile) throw new Error('emojiImage (file) is required.');

  if (IS_MOCK) {
    const id = `EMJ${Math.floor(100 + Math.random() * 900)}`;
    const imageUrl = URL.createObjectURL(emojiImageFile);
    const newObj = { emojiId: id, emojiType, imageUrl };
    mockState.emojiImages.push(newObj);
    notify();
    return {
      status: 'SUCCESS',
      message: 'Emoji uploaded successfully (mock)',
      data: newObj,
    };
  }

  const fd = new FormData();
  fd.append('emojiType', emojiType);
  fd.append('emojiImage', emojiImageFile);

  const headers = {
    ...authHeaders(),
    // Do not set Content-Type so browser sets boundary automatically
  };

  try {
    const r = await fetch(`${BASE_URL}/fan-engagement/emoji/v1/upload`, {
      method: 'POST',
      headers,
      body: fd,
    });
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    const data = await r.json().catch(() => ({}));
    return data;
  } catch (err) {
    console.warn('Upload emoji image failed:', err?.message || err);
    throw err;
  }
}

async function safeFetch(url, options) {
  try {
    const r = await fetch(url, options);
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    const contentType = r.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await r.json().catch(() => ({}));
      return data;
    }
    // Fallback for plain responses
    return await r.json().catch(() => ({}));
  } catch (err) {
    console.warn('API error:', err?.message || err);
    throw err;
  }
}

/** Mock state and helpers */
let mockState = {
  emojis: ['❤️', '👏', '😂', '😮', '🔥', '⭐'],
  // Image-based emojis uploaded via mock upload
  emojiImages: [],
  stats: [
    { label: 'Positive', teamRed: 62, teamBlue: 38 },
    { label: 'Excited', teamRed: 54, teamBlue: 46 },
    { label: 'Neutral', teamRed: 40, teamBlue: 60 },
    { label: 'Negative', teamRed: 35, teamBlue: 65 },
    { label: 'Surprised', teamRed: 58, teamBlue: 42 },
  ]
};

function randomizeStat(s) {
  const delta = (Math.random() * 6) - 3; // -3 to +3
  let r = Math.max(0, Math.min(100, Math.round(s.teamRed + delta)));
  let b = 100 - r;
  return { ...s, teamRed: r, teamBlue: b };
}

function notify() {
  // Placeholder for websocket/event notifications integration
}
