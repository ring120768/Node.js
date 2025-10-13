
// Simple in-memory idempotency helper.
// Swap to a DB-backed version for durability in production.
const seen = new Set();
const TTL_MS = 60 * 60 * 1000; // 1 hour
setInterval(() => seen.clear(), TTL_MS).unref();

function isDuplicate(id) {
  if (!id) return false;
  if (seen.has(id)) return true;
  seen.add(id);
  return false;
}

module.exports = { isDuplicate };
