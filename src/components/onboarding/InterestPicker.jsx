import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getCategoryTreeDynamic } from '@/lib/categories';
import { Sparkles, CheckCircle, Loader2 } from 'lucide-react';

const CATEGORY_EMOJIS = {
  electronics: '📱',
  clothing: '👕',
  shoes: '👟',
  sports: '⚽',
  accessories: '💼',
  phones: '📞',
};

export default function InterestPicker({ user, onDone }) {
  const categories = getCategoryTreeDynamic();
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (value) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size < 2 || saving) return;
    setSaving(true);

    const viewedCategories = {};
    selected.forEach(cat => { viewedCategories[cat] = 3; });

    const existing = await base44.entities.UserBehavior.filter({ user_email: user.email }, null, 1).catch(() => []);
    const profile = existing[0];

    if (profile?.id) {
      await base44.entities.UserBehavior.update(profile.id, {
        viewed_categories: { ...(profile.viewed_categories || {}), ...viewedCategories },
        seeded: true,
      }).catch(() => {});
    } else {
      await base44.entities.UserBehavior.create({
        user_email: user.email,
        viewed_categories: viewedCategories,
        seeded: true,
      }).catch(() => {});
    }

    setSaving(false);
    onDone();
  };

  const remaining = Math.max(0, 2 - selected.size);

  return (
    <div className="px-6 py-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Pick your interests</span>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground mb-4">
        Select at least 2 so we can personalize your feed right away.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {categories.map(cat => {
          const active = selected.has(cat.value);
          return (
            <button
              key={cat.value}
              onClick={() => toggle(cat.value)}
              className="flex items-center gap-2 px-3 py-3 border text-left transition-all"
              style={{
                background: active ? 'rgba(180,255,0,0.1)' : 'rgba(255,255,255,0.03)',
                borderColor: active ? 'rgba(180,255,0,0.5)' : 'rgba(255,255,255,0.1)',
                color: active ? 'hsl(72,100%,50%)' : 'rgba(255,255,255,0.6)',
              }}
            >
              <span className="text-lg">{CATEGORY_EMOJIS[cat.value] || '🛒'}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider flex-1">{cat.label}</span>
              {active && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={selected.size < 2 || saving}
        className="w-full h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-mono font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          : `Continue with ${selected.size} interest${selected.size !== 1 ? 's' : ''}`
        }
      </button>

      {remaining > 0 && (
        <p className="font-mono text-[10px] text-muted-foreground text-center mt-2">
          Select {remaining} more to continue
        </p>
      )}
    </div>
  );
}