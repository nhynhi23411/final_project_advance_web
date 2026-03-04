/* server/src/common/blacklist-store.js */

// Cache in-memory
let cache = {
  keywords: null,
  expiresAt: 0,
};

function normalizeText(s) {
  return String(s || "").toLowerCase();
}

/**
 * Fetch active blacklist keywords from DB with caching.
 * @param {import("mongodb").Db} db
 * @param {{cacheMs?: number}} opts
 * @returns {Promise<string[]>}
 */
async function getActiveBlacklistedKeywords(db, opts = {}) {
  const cacheMs = opts.cacheMs ?? 5 * 60 * 1000;
  const now = Date.now();

  if (cache.keywords && cache.expiresAt > now) {
    return cache.keywords;
  }

  const rows = await db
    .collection("blacklisted_keywords")
    .find({ is_active: true })
    .project({ keyword: 1, _id: 0 })
    .toArray();

  const keywords = rows
    .map((r) => r.keyword)
    .filter(Boolean)
    .map((s) => String(s).trim().toLowerCase())
    .filter((s) => s.length > 0);

  cache = {
    keywords,
    expiresAt: now + cacheMs,
  };

  return keywords;
}

/**
 * Naive contains-check (works well for phrases like "chuyển khoản trước", "t.me", "bit.ly"...).
 * @param {string} text
 * @param {string[]} keywords (already normalized to lowercase)
 * @returns {{hits: string[]}}
 */
function findBlacklistedHits(text, keywords) {
  const t = normalizeText(text);
  if (!t || !Array.isArray(keywords) || keywords.length === 0) return { hits: [] };

  const hits = [];
  for (const kw of keywords) {
    if (!kw) continue;
    if (t.includes(kw)) hits.push(kw);
  }

  // unique hits
  return { hits: [...new Set(hits)] };
}

/**
 * Optional: clear cache (useful in tests / admin toggle)
 */
function clearBlacklistCache() {
  cache = { keywords: null, expiresAt: 0 };
}

module.exports = {
  getActiveBlacklistedKeywords,
  findBlacklistedHits,
  clearBlacklistCache,
};