import React from 'react';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'sports', label: 'Sports' },
  { value: 'phones', label: 'Phones' },
  { value: 'shoes', label: 'Shoes' },
];

export default function CategoryFilter({ active, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none justify-start pb-0.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', overflowX: 'scroll' }}>
      {CATEGORIES.map(cat => (
        <button
          key={cat.value}
          onClick={() => onChange(cat.value)}
          className={`px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border transition-all duration-200 rounded-full active:scale-95 ${
            active === cat.value
              ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(180,255,0,0.35)]'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary/60 hover:text-primary/80'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}