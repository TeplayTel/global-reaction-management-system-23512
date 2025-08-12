/**
 * API service for the admin frontend.
 * Uses REACT_APP_API_BASE_URL if provided; otherwise falls back to mock data.
 */

const BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
const IS_MOCK = !BASE_URL;

// PUBLIC_INTERFACE
export async function getEmojis() {
  /** Fetch current emoji list from backend or return mock data. */
  if (IS_MOCK) {
    return mockState.emojis.slice();
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
    return mockState.emojis.slice();
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
  /** Remove an emoji from the list. */
  if (IS_MOCK) {
    mockState.emojis = mockState.emojis.filter(e => e !== emoji);
    notify();
    return mockState.emojis.slice();
  }
  const res = await safeFetch(`${BASE_URL}/emojis/${encodeURIComponent(emoji)}`, {
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
