/**
 * API service for the admin frontend.
 * Uses REACT_APP_API_BASE_URL if provided; otherwise falls back to mock data.
 */

const BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const IS_MOCK = !BASE_URL;

// PUBLIC_INTERFACE
export async function getEmojis() {
  /** Fetch current emoji list from backend or return mock data.
   * Returns a heterogeneous list that can contain:
   * - plain Unicode emoji strings
   * - uploaded image emoji objects: { emojiId, emojiType, imageUrl }
   */
  if (IS_MOCK) {
    // Merge text and image-based emojis for the mock
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }
  const res = await safeFetch(`${BASE_URL}/emojis`);
  return res;
}

// PUBLIC_INTERFACE
export async function addEmoji(emoji) {
  /** Add a new emoji to the list. */
  if (IS_MOCK) {
    if (!emoji) throw new Error('Emoji is required.');
    if (!mockState.emojis.includes(emoji)) {
      mockState.emojis.push(emoji);
      notify();
    }
    // Return combined for consistency with getEmojis
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }
  const res = await safeFetch(`${BASE_URL}/emojis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emoji }),
  });
  return res;
}

 // PUBLIC_INTERFACE
export async function removeEmoji(emoji) {
  /** Remove a Unicode emoji from the list.
   * Note: Removing uploaded image emojis is not implemented in the mock.
   */
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
  });
  return res;
}

// PUBLIC_INTERFACE
export async function removeEmojiImage(emojiIdOrUrl) {
  /** Remove an uploaded image-based emoji from the list.
   * When BASE_URL is not set (mock mode), this removes from in-memory store by matching:
   * - emojiId OR
   * - imageUrl OR
   * - a composed id in the form "type:<emojiType>:<imageUrl>"
   * Returns the unified list combining text and image emojis, for consistency with getEmojis().
   */
  if (!emojiIdOrUrl) throw new Error('emojiIdOrUrl is required.');
  if (IS_MOCK) {
    const input = String(emojiIdOrUrl);
    let targetUrl = null;
    let targetId = null;
    if (input.startsWith('type:')) {
      // Extract the URL part after the last colon
      const lastColon = input.lastIndexOf(':');
      if (lastColon > -1) {
        targetUrl = input.slice(lastColon + 1);
      }
    } else if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('blob:')) {
      targetUrl = input;
    } else {
      targetId = input;
    }

    mockState.emojiImages = mockState.emojiImages.filter(obj => {
      if (targetId && obj.emojiId === targetId) return false;
      if (targetUrl && obj.imageUrl === targetUrl) return false;
      return true;
    });
    notify();
    return [
      ...mockState.emojis.slice(),
      ...mockState.emojiImages.map(obj => ({ ...obj })),
    ];
  }

  // Best-effort backend endpoint guess; adjust according to backend API spec when available.
  const res = await safeFetch(`${BASE_URL}/fan-engagement/emoji/v1/${encodeURIComponent(emojiIdOrUrl)}`, {
    method: 'DELETE',
  });
  return res;
}

// PUBLIC_INTERFACE
export async function getAnalytics() {
  /** Fetch analytics data. */
  if (IS_MOCK) {
    // randomize a bit to simulate "live" analytics
    return mockState.stats.map(s => randomizeStat(s));
  }
  const res = await safeFetch(`${BASE_URL}/analytics/global`);
  return res;
}

// PUBLIC_INTERFACE
export async function uploadEmojiImage(emojiType, emojiImageFile) {
  /** Upload a new image-based emoji using multipart/form-data.
   * Expects:
   * - emojiType: string (e.g., "fire")
   * - emojiImageFile: File (image/*)
   * When BASE_URL is not set (mock mode), the image is stored in memory
   * and an object URL is generated for preview.
   */
  if (!emojiType) throw new Error('emojiType is required.');
  if (!emojiImageFile) throw new Error('emojiImage (file) is required.');

  if (IS_MOCK) {
    // Create a mock emoji object and add to mock state
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

  const headers = {};
  // Do NOT set Content-Type explicitly so the browser sets boundary correctly.
  const adminToken = process.env.REACT_APP_ADMIN_TOKEN;
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

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
    const data = await r.json().catch(() => ({}));
    return data;
  } catch (err) {
    console.warn('API error, falling back if possible:', err?.message || err);
    if (IS_MOCK) {
      // Mock already handled by callers
      throw err;
    }
    // Re-throw so UI can handle
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
  // In real integration, this should trigger updates across clients.
}
