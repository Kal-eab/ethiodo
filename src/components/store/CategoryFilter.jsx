import React from 'react';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'foods', label: 'Foods' },
  { value: 'hygiene', label: 'Hygiene' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'home', label: 'Home' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-wider whitespace-nowrap border transition-all duration-200 ${
            active === cat.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}