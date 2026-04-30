import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, FolderPlus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * Admin category manager — reads/writes lib/categories.js via localStorage override.
 * Changes persist in the browser and are reflected live in CategoryFilter & ProductForm.
 *
 * NOTE: Because lib/categories.js is a static file, this page lets admins visually
 * manage a JSON copy stored in localStorage ('ethiodo_categories'). The app reads
 * from localStorage on startup when it exists, falling back to the static file.
 */

const STORAGE_KEY = 'ethiodo_categories';

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

function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export default function AdminCategories() {
  const [tree, setTree] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TREE;
    } catch {
      return DEFAULT_TREE;
    }
  });

  const [newParentLabel, setNewParentLabel] = useState('');
  const [newSub, setNewSub] = useState({}); // { parentValue: label }
  const [expanded, setExpanded] = useState({});

  const save = (nextTree) => {
    setTree(nextTree);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTree));
    toast.success('Categories saved! Refresh the store to see changes.');
  };

  const addParent = () => {
    const label = newParentLabel.trim();
    if (!label) return;
    const value = slugify(label);
    if (tree.find(c => c.value === value)) {
      toast.error('A category with that name already exists.');
      return;
    }
    save([...tree, { value, label, subcategories: [] }]);
    setNewParentLabel('');
  };

  const deleteParent = (value) => {
    if (!window.confirm('Delete this category and all its subcategories?')) return;
    save(tree.filter(c => c.value !== value));
  };

  const addSubcategory = (parentValue) => {
    const label = (newSub[parentValue] || '').trim();
    if (!label) return;
    const subValue = `${parentValue}_${slugify(label)}`;
    const next = tree.map(c => {
      if (c.value !== parentValue) return c;
      if (c.subcategories.find(s => s.value === subValue)) {
        toast.error('Subcategory already exists.');
        return c;
      }
      return { ...c, subcategories: [...c.subcategories, { value: subValue, label }] };
    });
    save(next);
    setNewSub(s => ({ ...s, [parentValue]: '' }));
  };

  const deleteSubcategory = (parentValue, subValue) => {
    save(tree.map(c => {
      if (c.value !== parentValue) return c;
      return { ...c, subcategories: c.subcategories.filter(s => s.value !== subValue) };
    }));
  };

  const toggleExpand = (value) => setExpanded(e => ({ ...e, [value]: !e[value] }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          Add or remove categories and subcategories. Changes apply immediately to the store filter and product form.
        </p>
      </div>

      {/* Category list */}
      <div className="space-y-3">
        {tree.map(cat => (
          <div key={cat.value} className="bg-card border border-border overflow-hidden">
            {/* Parent row */}
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30">
              <button onClick={() => toggleExpand(cat.value)} className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className={`w-4 h-4 transition-transform ${expanded[cat.value] ? 'rotate-90' : ''}`} />
              </button>
              <div className="flex-1">
                <span className="font-semibold text-sm">{cat.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground ml-2">{cat.value}</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{cat.subcategories.length} sub</span>
              <button
                onClick={() => deleteParent(cat.value)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Subcategories */}
            {expanded[cat.value] && (
              <div className="px-4 py-3 space-y-2 border-t border-border">
                {cat.subcategories.length === 0 && (
                  <p className="font-mono text-xs text-muted-foreground">No subcategories yet.</p>
                )}
                {cat.subcategories.map(sub => (
                  <div key={sub.value} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                    <ChevronRight className="w-3 h-3 text-muted-foreground/40 ml-2" />
                    <span className="flex-1 text-sm">{sub.label}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{sub.value}</span>
                    <button
                      onClick={() => deleteSubcategory(cat.value, sub.value)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add subcategory */}
                <div className="flex gap-2 pt-2">
                  <Input
                    value={newSub[cat.value] || ''}
                    onChange={e => setNewSub(s => ({ ...s, [cat.value]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addSubcategory(cat.value); }}
                    placeholder={`New subcategory under ${cat.label}…`}
                    className="bg-secondary border-border h-9 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => addSubcategory(cat.value)}
                    disabled={!(newSub[cat.value] || '').trim()}
                    className="bg-primary text-primary-foreground font-mono"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new top-level category */}
      <div className="bg-card border border-border p-4 space-y-3">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <FolderPlus className="w-3.5 h-3.5" /> Add Top-Level Category
        </p>
        <div className="flex gap-2">
          <Input
            value={newParentLabel}
            onChange={e => setNewParentLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addParent(); }}
            placeholder='e.g. "Beauty", "Home & Garden"'
            className="bg-secondary border-border h-10 flex-1"
          />
          <Button
            onClick={addParent}
            disabled={!newParentLabel.trim()}
            className="bg-primary text-primary-foreground font-mono"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Category
          </Button>
        </div>
      </div>
    </div>
  );
}