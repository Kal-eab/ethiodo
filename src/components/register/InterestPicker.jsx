import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { getCategoryTreeDynamic } from '@/lib/categories';

export default function InterestPicker({ user, onComplete }) {
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const categories = getCategoryTreeDynamic();

  const toggle = (value) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size < 2) return;
    setSaving(true);
    try {
      const viewedCategories = {};
      for (const cat of selected) {
        viewedCategories[cat] = 3;
      }
      const existing = await base44.entities.UserBehavior.filter({ user_email: user.email }, null, 1);
      if (existing[0]?.id) {
        await base44.entities.UserBehavior.update(existing[0].id, {
          viewed_categories: { ...(existing[0].viewed_categories || {}), ...viewedCategories },
          seeded: true,
        });
      } else {
        await base44.entities.UserBehavior.create({
          user_email: user.email,
          viewed_categories: viewedCategories,
          seeded: true,
          last_active_at: new Date().toISOString(),
        });
      }
    } catch {
      // Don't block navigation on failure
    }
    setSaving(false);
    onComplete();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #111 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <img
          src="/logo.png"
          alt="Ethiodo"
          className="h-10 w-10 rounded-full"
          style={{ boxShadow: '0 0 14px rgba(180,255,0,0.4)' }}
        />
        <span
          className="font-bold text-xl tracking-tight text-white"
          style={{ textShadow: '0 0 12px rgba(180,255,0,0.3)' }}
        >
          ETHIODO
        </span>
      </div>

      <div className="w-full max-w-md bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className="px-6 pt-6 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(135deg, rgba(180,255,0,0.05) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-bold text-lg">Pick Your Interests</h2>
          </div>
          <p className="text-muted-foreground text-xs font-mono">
            Select at least 2 categories to personalise your feed
          </p>
        </div>

        {/* Category chips */}
        <div className="px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const isSelected = selected.has(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => toggle(cat.value)}
                  className="px-4 py-2 font-mono text-xs uppercase tracking-wider border transition-all"
                  style={{
                    background: isSelected ? 'rgba(180,255,0,0.15)' : 'rgba(255,255,255,0.04)',
                    borderColor: isSelected ? 'hsl(72,100%,50%)' : 'rgba(255,255,255,0.15)',
                    color: isSelected ? 'hsl(72,100%,50%)' : 'rgba(255,255,255,0.6)',
                    boxShadow: isSelected ? '0 0 8px rgba(180,255,0,0.2)' : 'none',
                  }}
                >
                  {isSelected ? '✓ ' : ''}{cat.label}
                </button>
              );
            })}
          </div>
          {selected.size > 0 && selected.size < 2 && (
            <p className="font-mono text-[10px] text-muted-foreground mt-3">
              Pick {2 - selected.size} more to continue
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-1 flex gap-3">
          <button
            onClick={onComplete}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-mono text-xs uppercase tracking-wider hover:bg-secondary/80 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.size < 2 || saving}
            className="flex-1 h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent animate-spin rounded-full" />
            ) : (
              <><CheckCircle className="w-4 h-4" /> Let's Go <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}