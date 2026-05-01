/**
 * Smart product search with relevance ranking.
 * Supports: multi-keyword, partial match, case-insensitive, fuzzy, ranked results.
 */

// Simple Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(word, target) {
  if (word.length <= 3) return target.includes(word);
  const maxDist = word.length <= 5 ? 1 : 2;
  // Check if any substring of target is close enough
  for (let i = 0; i <= target.length - word.length + maxDist; i++) {
    const sub = target.slice(i, i + word.length);
    if (levenshtein(word, sub) <= maxDist) return true;
  }
  return false;
}

function scoreProduct(product, keywords) {
  if (!product) return 0;
  const name = (product.name || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const description = (product.description || '').toLowerCase();
  const tags = (product.tags || '').toLowerCase();

  let totalScore = 0;

  for (const kw of keywords) {
    if (!kw) continue;
    let kwScore = 0;

    // Exact name match (highest)
    if (name === kw) kwScore += 100;
    // Name starts with keyword
    else if (name.startsWith(kw)) kwScore += 80;
    // Name contains keyword
    else if (name.includes(kw)) kwScore += 60;
    // Tags match
    if (tags.includes(kw)) kwScore += 40;
    // Category match
    if (category.includes(kw)) kwScore += 30;
    // Description match (lowest)
    if (description.includes(kw)) kwScore += 10;

    // Fuzzy fallback if no direct match found
    if (kwScore === 0) {
      if (isFuzzyMatch(kw, name)) kwScore += 20;
      else if (isFuzzyMatch(kw, tags)) kwScore += 15;
      else if (isFuzzyMatch(kw, category)) kwScore += 10;
      else if (isFuzzyMatch(kw, description)) kwScore += 5;
    }

    totalScore += kwScore;
  }

  return totalScore;
}

/**
 * Search and rank products by relevance.
 * @param {Array} products - all products
 * @param {string} query - search query string
 * @returns {Array} filtered + ranked products
 */
export function searchProducts(products, query) {
  if (!query || !query.trim()) return products;

  const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const scored = products
    .map(product => ({ product, score: scoreProduct(product, keywords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ product }) => product);
}

/**
 * Generate autocomplete suggestions from product names and tags.
 * @param {Array} products
 * @param {string} query
 * @param {number} limit
 * @returns {string[]}
 */
export function getAutocompleteSuggestions(products, query, limit = 6) {
  if (!query || query.trim().length < 1) return [];
  const q = query.trim().toLowerCase();

  const suggestions = new Set();

  for (const product of products) {
    const name = product.name || '';
    if (name.toLowerCase().includes(q)) suggestions.add(name);

    const tags = (product.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    for (const tag of tags) {
      if (tag.toLowerCase().includes(q)) suggestions.add(tag);
    }
  }

  return Array.from(suggestions).slice(0, limit);
}