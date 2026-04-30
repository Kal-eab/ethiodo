import React from 'react';
import { CATEGORY_TREE, getSubcategories } from '@/lib/categories';

export default function CategoryFilter({ active, onChange }) {
  // Determine if active is a subcategory and find its parent
  const activeParent = CATEGORY_TREE.find(c =>
    c.subcategories.some(s => s.value === active)
  )?.value || null;

  // The "selected" top-level: either the active top-level or the parent of active sub
  const selectedTop = activeParent || (CATEGORY_TREE.find(c => c.value === active) ? active : null);

  const subcategories = selectedTop ? getSubcategories(selectedTop) : [];

  return (
    <div className="space-y-1.5">
      {/* Top-level row */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
        <button
          onClick={() => onChange('all')}
          className={`px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border transition-all duration-200 rounded-full active:scale-95 ${
            active === 'all'
              ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(180,255,0,0.35)]'
              : 'bg-transparent text-muted-foreground border-border hover:border-primary/60 hover:text-primary/80'
          }`}
        >
          All
        </button>
        {CATEGORY_TREE.map(cat => {
          const isActive = active === cat.value || activeParent === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => onChange(cat.value)}
              className={`px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border transition-all duration-200 rounded-full active:scale-95 ${
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_10px_rgba(180,255,0,0.35)]'
                  : 'bg-transparent text-muted-foreground border-border hover:border-primary/60 hover:text-primary/80'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Subcategory row — shown when a top-level with subcategories is selected */}
      {subcategories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-0.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
          {/* "All [Category]" chip — shows all products in the top-level group */}
          <button
            onClick={() => onChange(selectedTop)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border transition-all duration-200 rounded-full active:scale-95 ${
              active === selectedTop
                ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_8px_rgba(0,255,157,0.3)]'
                : 'bg-transparent text-muted-foreground border-border/60 hover:border-accent/60 hover:text-accent/80'
            }`}
          >
            All
          </button>
          {subcategories.map(sub => (
            <button
              key={sub.value}
              onClick={() => onChange(sub.value)}
              className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest whitespace-nowrap flex-shrink-0 border transition-all duration-200 rounded-full active:scale-95 ${
                active === sub.value
                  ? 'bg-accent text-accent-foreground border-accent shadow-[0_0_8px_rgba(0,255,157,0.3)]'
                  : 'bg-transparent text-muted-foreground border-border/60 hover:border-accent/60 hover:text-accent/80'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}