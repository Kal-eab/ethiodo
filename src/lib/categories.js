/**
 * Central category configuration.
 * Source of truth: CategoryConfig entity (single-row backend store).
 * Falls back to localStorage cache, then hardcoded defaults.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const DEFAULT_TREE = [
  {
    value: 'electronics', label: 'Electronics',
    subcategories: [
      { value: 'electronics_phones', label: 'Phones' },
      { value: 'electronics_laptops', label: 'Laptops' },
      { value: 'electronics_earphones', label: 'Earphones' },
      { value: 'electronics_tablets', label: 'Tablets' },
      { value: 'electronics_accessories', label: 'Accessories' },
    ],
  },
  {
    value: 'clothing', label: 'Clothing',
    subcategories: [
      { value: 'clothing_dress', label: 'Dress' },
      { value: 'clothing_tshirt', label: 'T-Shirt' },
      { value: 'clothing_jacket', label: 'Jacket' },
      { value: 'clothing_pants', label: 'Pants' },
      { value: 'clothing_hoodie', label: 'Hoodie' },
      { value: 'clothing_mens', label: "Men's" },
      { value: 'clothing_womens', label: "Women's" },
      { value: 'clothing_kids', label: 'Kids' },
    ],
  },
  {
    value: 'shoes', label: 'Shoes',
    subcategories: [
      { value: 'shoes_mens', label: "Men's" },
      { value: 'shoes_womens', label: "Women's" },
      { value: 'shoes_kids', label: 'Kids' },
      { value: 'shoes_sport', label: 'Sport' },
    ],
  },
  {
    value: 'sports', label: 'Sports',
    subcategories: [
      { value: 'sports_fitness', label: 'Fitness' },
      { value: 'sports_outdoor', label: 'Outdoor' },
    ],
  },
  {
    value: 'accessories', label: 'Accessories',
    subcategories: [],
  },
  {
    value: 'phones', label: 'Phones',
    subcategories: [],
  },
];

// ─── In-memory tree (live, reactive) ────────────────────────────────────────
let _initialized = false;
let _tree = loadFromCache();

function loadFromCache() {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ethiodo_categories');
      if (saved) return JSON.parse(saved);
    }
  } catch { /* fall through */ }
  return [...DEFAULT_TREE];
}

function saveToCache(tree) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ethiodo_categories', JSON.stringify(tree));
    }
  } catch { /* ignore */ }
}

function computeDerived(tree) {
  const topLevel = tree.map(c => c.value);
  const all = [...topLevel, ...tree.flatMap(c => c.subcategories.map(s => s.value))];
  return { topLevel, all };
}

/** Rebuild derived exports from the current tree */
function rebuildExports(tree) {
  const { topLevel, all } = computeDerived(tree);
  CATEGORY_TREE = tree;
  TOP_LEVEL_CATEGORIES = topLevel;
  ALL_CATEGORY_VALUES = all;
  _tree = tree;
}

// ─── Reactive exports (export let = live bindings) ──────────────────────────
export let CATEGORY_TREE = _tree;
export let TOP_LEVEL_CATEGORIES = computeDerived(_tree).topLevel;
export let ALL_CATEGORY_VALUES = computeDerived(_tree).all;

// ─── Subscriber system (for useCategoryTree hook) ───────────────────────────
const listeners = new Set();
export function onTreeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(fn => fn(_tree)); }

// ─── Backend fetch (async, called once on module init) ──────────────────────
async function loadFromBackend() {
  try {
    const rows = await base44.entities.CategoryConfig.list('-updated_date', 1);
    if (rows.length > 0 && rows[0].tree) {
      const backendTree = rows[0].tree;
      rebuildExports(backendTree);
      saveToCache(backendTree);
      notify();
    }
  } catch { /* offline / unauthenticated — use cache */ }
}

if (!_initialized) {
  _initialized = true;
  loadFromBackend();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** Returns current in-memory tree synchronously */
export function getCategoryTreeDynamic() {
  return _tree;
}

/** Get subcategories for a top-level category value */
export function getSubcategories(categoryValue) {
  const cat = _tree.find(c => c.value === categoryValue);
  return cat?.subcategories || [];
}

/** Get parent category value for a subcategory value */
export function getParentCategory(value) {
  for (const cat of _tree) {
    if (cat.subcategories.some(s => s.value === value)) {
      return cat.value;
    }
  }
  return null;
}

/** Get display label for any category value */
export function getCategoryLabel(value) {
  for (const cat of _tree) {
    if (cat.value === value) return cat.label;
    const sub = cat.subcategories.find(s => s.value === value);
    if (sub) return sub.label;
  }
  return value;
}

/** Get all top-level category values synchronously */
export function getTopLevelCategories() {
  return _tree.map(c => c.value);
}

/** React hook: returns the current tree and triggers re-render on changes */
export function useCategoryTree() {
  const [tree, setTree] = useState(_tree);
  useEffect(() => onTreeChange(t => setTree([...t])), []);
  return tree;
}

/** Admin: save tree to backend and local cache */
export async function publishCategoryTree(treeData) {
  const rows = await base44.entities.CategoryConfig.list('-updated_date', 1);
  if (rows.length > 0) {
    await base44.entities.CategoryConfig.update(rows[0].id, { tree: treeData });
  } else {
    await base44.entities.CategoryConfig.create({ tree: treeData });
  }
  rebuildExports(treeData);
  saveToCache(treeData);
  notify();
}