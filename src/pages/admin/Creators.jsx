import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Search, UserPlus, Link2, Copy, Check, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function randomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ─── Add Creator Modal ──────────────────────────────────────────────────────
function AddCreatorModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!handle.trim()) { toast.error('Handle is required'); return; }
    setSaving(true);
    await base44.entities.Creator.create({ name: name.trim(), handle: handle.trim(), status: 'active' });
    toast.success('Creator added');
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Add Creator</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground block mb-1">Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none" placeholder="e.g. ABG Vizuals" />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground block mb-1">Social Handle *</label>
          <input value={handle} onChange={e => setHandle(e.target.value)}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none" placeholder="e.g. @abg_vizuals" />
        </div>
        <button onClick={submit} disabled={saving}
          className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Save Creator
        </button>
      </div>
    </div>
  );
}

// ─── Add Product Link Modal ─────────────────────────────────────────────────
function AddLinkModal({ creators, products, onClose, onCreated }) {
  const [creatorId, setCreatorId] = useState('');
  const [productId, setProductId] = useState('');
  const [code, setCode] = useState(randomCode());
  const [saving, setSaving] = useState(false);

  const product = products.find(p => p.id === productId);
  const shareUrl = product ? `https://ethiodo.com/product/${product.id}?ref=${code}` : '';

  const submit = async () => {
    if (!creatorId) { toast.error('Select a creator'); return; }
    if (!productId) { toast.error('Select a product'); return; }
    if (!code.trim()) { toast.error('Code is required'); return; }
    setSaving(true);
    await base44.entities.CreatorProductLink.create({
      creator_id: creatorId,
      product_id: productId,
      code: code.trim(),
      share_url: shareUrl,
      confirmed_order_count: 0,
      total_confirmed_sales: 0,
    });
    toast.success('Product link created');
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-sm p-6 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Add Product Link</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground block mb-1">Creator *</label>
          <select value={creatorId} onChange={e => setCreatorId(e.target.value)}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none appearance-none">
            <option value="">Select creator…</option>
            {creators.filter(c => c.status === 'active').map(c => <option key={c.id} value={c.id}>{c.name} ({c.handle})</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground block mb-1">Product *</label>
          <select value={productId} onChange={e => { setProductId(e.target.value); }}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none appearance-none">
            <option value="">Select product…</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground block mb-1">Referral Code</label>
          <input value={code} onChange={e => setCode(e.target.value)}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none font-mono" placeholder="6-char code" />
          <button onClick={() => setCode(randomCode())} className="font-mono text-[10px] text-primary mt-1 hover:underline">Generate new code</button>
        </div>
        {shareUrl && (
          <div>
            <label className="font-mono text-xs text-muted-foreground block mb-1">Share URL</label>
            <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-1.5">
              <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">{shareUrl}</span>
            </div>
          </div>
        )}
        <button onClick={submit} disabled={saving}
          className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold flex items-center justify-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Create Link
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function AdminCreators() {
  const [search, setSearch] = useState('');
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const queryClient = useQueryClient();

  const { data: creators = [], isLoading: loadingCreators } = useQuery({
    queryKey: ['creators'],
    queryFn: () => base44.entities.Creator.list('-date_added', 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.filter({}, '-created_date', 500),
  });

  const { data: links = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['creator-product-links'],
    queryFn: () => base44.entities.CreatorProductLink.list('-date_created', 500),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['creators'] });
    queryClient.invalidateQueries({ queryKey: ['creator-product-links'] });
  };

  const creatorMap = Object.fromEntries(creators.map(c => [c.id, c]));
  const productMap = Object.fromEntries(products.map(p => [p.id, p]));

  const filtered = links.filter(link => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const creatorName = (creatorMap[link.creator_id]?.name || '').toLowerCase();
    const productName = (productMap[link.product_id]?.name || '').toLowerCase();
    return creatorName.includes(q) || productName.includes(q) || link.code?.toLowerCase().includes(q);
  });

  const isLoading = loadingCreators || loadingLinks;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Creators</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{links.length} product links · {creators.length} creators</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddCreator(true)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border font-mono text-xs uppercase hover:bg-secondary transition-colors">
            <UserPlus className="w-3.5 h-3.5" /> Add Creator
          </button>
          <button onClick={() => setShowAddLink(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold hover:bg-primary/90 transition-colors">
            <Link2 className="w-3.5 h-3.5" /> Add Product Link
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input type="text" placeholder="Search by creator, product, or code…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground" />
      </div>

      <div className="bg-card border border-border overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Creator</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Product</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Code</th>
              <th className="text-left p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Shareable Link</th>
              <th className="text-right p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Orders</th>
              <th className="text-right p-4 font-mono text-xs text-muted-foreground uppercase tracking-wider">Sales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="p-4"><div className="h-4 bg-secondary animate-pulse w-24" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center">
                  <Link2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="font-mono text-xs text-muted-foreground uppercase">No product links yet</p>
                </td>
              </tr>
            ) : (
              filtered.map(link => {
                const creator = creatorMap[link.creator_id];
                const product = productMap[link.product_id];
                return (
                  <tr key={link.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <p className="text-sm font-semibold">{creator?.name || '—'}</p>
                      <p className="font-mono text-[10px] text-muted-foreground">{creator?.handle || ''}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{product?.name || '—'}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs px-2 py-0.5 bg-primary/5 border border-primary/20 text-primary">{link.code}</span>
                    </td>
                    <td className="p-4">
                      <CopyButton url={link.share_url} />
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-sm font-bold">{link.confirmed_order_count || 0}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-mono text-sm font-bold text-primary">
                        {Number(link.total_confirmed_sales || 0).toLocaleString()} Birr
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAddCreator && <AddCreatorModal onClose={() => setShowAddCreator(false)} onCreated={refresh} />}
      {showAddLink && <AddLinkModal creators={creators} products={products} onClose={() => setShowAddLink(false)} onCreated={refresh} />}
    </div>
  );
}

// ─── Copy button ────────────────────────────────────────────────────────────
function CopyButton({ url }) {
  const [copied, setCopied] = useState(false);
  if (!url) return <span className="font-mono text-xs text-muted-foreground">—</span>;
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 border border-border hover:border-primary/40 transition-colors max-w-[220px]"
      style={copied ? { borderColor: 'hsl(157,100%,50%)', color: 'hsl(157,100%,50%)' } : {}}>
      <span className="truncate">{url}</span>
      {copied ? <Check className="w-3 h-3 flex-shrink-0" /> : <Copy className="w-3 h-3 flex-shrink-0 text-muted-foreground" />}
    </button>
  );
}