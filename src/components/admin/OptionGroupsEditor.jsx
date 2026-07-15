import React, { useState, useRef } from 'react';
import { Plus, X, Trash2, Loader2, Pencil, Check, ImagePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { uid, uploadProductImage } from '@/lib/productOptions';

// Size presets reused as one-tap toggles, mirroring the old SizeSelector.
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

function presetSizesForCategory(category = '') {
  if (category.startsWith('shoes')) return SHOE_SIZES;
  return CLOTHING_SIZES;
}

// ── One option group card ──────────────────────────────────────────────────
function GroupCard({ group, category, onChange, onRemove }) {
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('');
  const [showPrice, setShowPrice] = useState(false);
  const [pendingImage, setPendingImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const labelRef = useRef(null);

  const values = group.values || [];
  // Only surface the one-tap size chips on a group the admin named "Size" —
  // they'd be noise on a Color/Storage group.
  const sizePresets = group.name.trim().toLowerCase() === 'size' ? presetSizesForCategory(category) : null;

  const setValues = (next) => onChange({ ...group, values: next });

  const labelExists = (l, exceptId) =>
    values.some(v => v.id !== exceptId && v.label.toLowerCase() === l.toLowerCase());

  const addValue = () => {
    const l = label.trim();
    if (!l) return;
    if (labelExists(l)) { toast.error(`"${l}" already exists in this group`); return; }
    const v = { id: uid('v'), label: l };
    if (pendingImage) v.image = pendingImage;
    if (showPrice && Number(price) > 0) v.price_add = Number(price);
    setValues([...values, v]);
    setLabel('');
    setPrice('');
    setPendingImage('');
    setShowPrice(false);
    labelRef.current?.focus();
  };

  const removeValue = (id) => setValues(values.filter(v => v.id !== id));

  const updateValue = (id, patch) => {
    if (patch.label != null) {
      const l = patch.label.trim();
      if (!l) { toast.error('Label cannot be empty'); return; }
      if (labelExists(l, id)) { toast.error(`"${l}" already exists in this group`); return; }
    }
    setValues(values.map(v => (v.id === id ? { ...v, ...patch } : v)));
  };

  // Toggle a standard size chip on/off (for the Size preset convenience).
  const toggleSize = (s) => {
    const existing = values.find(v => v.label === s);
    if (existing) removeValue(existing.id);
    else setValues([...values, { id: uid('v'), label: s }]);
  };

  const uploadImage = async (file, onDone) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      onDone(url);
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-border bg-secondary/30 p-3 space-y-3">
      {/* Group name + delete */}
      <div className="flex items-center gap-2">
        <Input
          value={group.name}
          onChange={e => onChange({ ...group, name: e.target.value })}
          placeholder="Group name, e.g. Color, Size, Storage"
          className="bg-background border-border h-9 flex-1 font-mono text-sm"
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 px-2.5 h-9 border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors font-mono text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Size preset chips — one-tap toggles */}
      {sizePresets && (
        <div className="flex flex-wrap gap-1.5">
          {sizePresets.map(s => {
            const on = values.some(v => v.label === s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSize(s)}
                className={`px-2.5 py-1 font-mono text-[11px] font-bold border transition-all select-none ${
                  on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {/* Existing values */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map(v => (
            <ValueCard
              key={v.id}
              value={v}
              editing={editingId === v.id}
              onEdit={() => setEditingId(v.id)}
              onStopEdit={() => setEditingId(null)}
              onUpdate={patch => updateValue(v.id, patch)}
              onRemove={() => removeValue(v.id)}
              uploadImage={uploadImage}
              uploading={uploading}
            />
          ))}
        </div>
      )}

      {/* Add value form */}
      <div className="space-y-2 border-t border-border/60 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Optional image for this value */}
          <label className="w-11 h-11 flex-shrink-0 border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors overflow-hidden bg-background">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; uploadImage(f, setPendingImage); }}
            />
            {uploading && !pendingImage ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            ) : pendingImage ? (
              <img src={pendingImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImagePlus className="w-4 h-4 text-muted-foreground" />
            )}
          </label>
          <Input
            ref={labelRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
            placeholder="Add value, e.g. White, XL, 256GB"
            className="bg-background border-border h-9 flex-1 min-w-[140px] font-mono text-sm"
          />
          <button
            type="button"
            onClick={addValue}
            disabled={!label.trim()}
            className="flex items-center gap-1 px-3 h-9 border border-primary text-primary font-mono text-xs hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="flex items-center gap-2">
          {showPrice ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground uppercase">Extra price (Birr)</span>
              <Input
                type="number"
                value={price}
                onChange={e => setPrice(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addValue(); } }}
                placeholder="0"
                className="bg-background border-border h-8 w-24 font-mono text-sm"
              />
              <button type="button" onClick={() => { setShowPrice(false); setPrice(''); }} className="text-muted-foreground hover:text-destructive">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPrice(true)}
              className="font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              + extra price
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── A single value: photo card or text chip, with edit/remove ──────────────
function ValueCard({ value, editing, onEdit, onStopEdit, onUpdate, onRemove, uploadImage, uploading }) {
  const [draftLabel, setDraftLabel] = useState(value.label);
  const [draftPrice, setDraftPrice] = useState(value.price_add ? String(value.price_add) : '');

  if (editing) {
    const save = () => {
      onUpdate({
        label: draftLabel,
        price_add: Number(draftPrice) > 0 ? Number(draftPrice) : undefined,
      });
      onStopEdit();
    };
    return (
      <div className="border border-primary/50 bg-background p-2 space-y-2 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          {value.image && <img src={value.image} alt="" className="w-9 h-9 object-cover border border-border" />}
          <Input
            value={draftLabel}
            onChange={e => setDraftLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            className="bg-secondary border-border h-8 w-32 font-mono text-sm"
            autoFocus
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">+Birr</span>
          <Input
            type="number"
            value={draftPrice}
            onChange={e => setDraftPrice(e.target.value)}
            placeholder="0"
            className="bg-secondary border-border h-8 w-20 font-mono text-sm"
          />
          <label className="text-muted-foreground hover:text-primary cursor-pointer" title="Change photo">
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; uploadImage(f, url => onUpdate({ image: url })); }} />
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </label>
          {value.image && (
            <button type="button" onClick={() => onUpdate({ image: undefined })} className="text-muted-foreground hover:text-destructive" title="Remove photo">
              <X className="w-4 h-4" />
            </button>
          )}
          <button type="button" onClick={save} className="ml-auto text-primary" title="Done">
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Photo card
  if (value.image) {
    return (
      <div className="relative w-20 group">
        <div className="w-20 h-20 border border-border overflow-hidden bg-background">
          <img src={value.image} alt={value.label} className="w-full h-full object-cover" />
        </div>
        <p className="font-mono text-[10px] text-center truncate mt-0.5">{value.label}</p>
        {value.price_add > 0 && (
          <p className="font-mono text-[9px] text-center text-primary">+{value.price_add}</p>
        )}
        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onEdit} className="bg-black/60 text-white p-0.5" title="Edit"><Pencil className="w-3 h-3" /></button>
          <button type="button" onClick={onRemove} className="bg-destructive text-destructive-foreground p-0.5" title="Remove"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  // Text chip
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border font-mono text-xs">
      {value.label}
      {value.price_add > 0 && <span className="text-primary">+{value.price_add}</span>}
      <button type="button" onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="w-3 h-3" /></button>
      <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove"><X className="w-3 h-3" /></button>
    </span>
  );
}

// ── The editor ─────────────────────────────────────────────────────────────
export default function OptionGroupsEditor({ value = [], category, onChange }) {
  const groups = value;

  const updateGroup = (id, next) => onChange(groups.map(g => (g.id === id ? next : g)));
  const removeGroup = (id) => onChange(groups.filter(g => g.id !== id));
  const addGroup = (name = '') => onChange([...groups, { id: uid('g'), name, values: [] }]);

  const PRESETS = [
    { label: 'Color (with photos)', name: 'Color' },
    { label: 'Size', name: 'Size' },
    { label: 'Storage', name: 'Storage' },
    { label: 'Custom', name: '' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted-foreground">
          Define the options customers pick from. Values with photos show as cards; the rest as chips.
        </p>
        <button
          type="button"
          onClick={() => addGroup()}
          disabled={groups.length >= 4}
          className="flex items-center gap-1 px-2.5 h-8 border border-primary text-primary font-mono text-[11px] hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="border border-dashed border-border p-4 space-y-2">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => addGroup(p.name)}
                className="px-3 h-8 border border-border font-mono text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              category={category}
              onChange={next => updateGroup(g.id, next)}
              onRemove={() => removeGroup(g.id)}
            />
          ))}
          {groups.length < 4 && (
            <p className="font-mono text-[10px] text-muted-foreground">Up to 4 groups. Empty groups are dropped when you save.</p>
          )}
        </div>
      )}
    </div>
  );
}
