/**
 * Central category configuration.
 * Top-level categories and their subcategories.
 * Edit this file to add/remove categories or subcategories.
 */
export const CATEGORY_TREE = [
  {
    value: 'electronics',
    label: 'Electronics',
    subcategories: [
      { value: 'electronics_phones', label: 'Phones' },
      { value: 'electronics_laptops', label: 'Laptops' },
      { value: 'electronics_earphones', label: 'Earphones' },
      { value: 'electronics_tablets', label: 'Tablets' },
      { value: 'electronics_accessories', label: 'Accessories' },
    ],
  },
  {
    value: 'clothing',
    label: 'Clothing',
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
    value: 'shoes',
    label: 'Shoes',
    subcategories: [
      { value: 'shoes_mens', label: "Men's" },
      { value: 'shoes_womens', label: "Women's" },
      { value: 'shoes_kids', label: 'Kids' },
      { value: 'shoes_sport', label: 'Sport' },
    ],
  },
  {
    value: 'sports',
    label: 'Sports',
    subcategories: [
      { value: 'sports_fitness', label: 'Fitness' },
      { value: 'sports_outdoor', label: 'Outdoor' },
    ],
  },
  {
    value: 'accessories',
    label: 'Accessories',
    subcategories: [],
  },
  {
    value: 'phones',
    label: 'Phones',
    subcategories: [],
  },
];

/** Flat list of all top-level category values */
export const TOP_LEVEL_CATEGORIES = CATEGORY_TREE.map(c => c.value);

/** Get subcategories for a given top-level category value */
export function getSubcategories(categoryValue) {
  const cat = CATEGORY_TREE.find(c => c.value === categoryValue);
  return cat?.subcategories || [];
}

/** Get the parent category value for a subcategory value */
export function getParentCategory(value) {
  for (const cat of CATEGORY_TREE) {
    if (cat.subcategories.some(s => s.value === value)) {
      return cat.value;
    }
  }
  return null;
}

/** All category values (top-level + subcategories) as a flat array for entity enum */
export const ALL_CATEGORY_VALUES = [
  ...TOP_LEVEL_CATEGORIES,
  ...CATEGORY_TREE.flatMap(c => c.subcategories.map(s => s.value)),
];

/** Get label for any category value */
export function getCategoryLabel(value) {
  for (const cat of CATEGORY_TREE) {
    if (cat.value === value) return cat.label;
    const sub = cat.subcategories.find(s => s.value === value);
    if (sub) return sub.label;
  }
  return value;
}