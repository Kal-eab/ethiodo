import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CATEGORIES = ['electronics', 'clothing', 'accessories', 'sports', 'phones', 'shoes'];

const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44'];
const CLOTHING_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const PREDEFINED_CATEGORIES = ['clothing', 'shoes'];

function SizeSelector({ category, sizes, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const isPredefined = PREDEFINED_CATEGORIES.includes(category);

  const toggleSize = (s) => {
    const next = sizes.includes(s) ? sizes.filter(x => x !== s) : [...sizes, s];
    onChange(next);
  };

  const addCustomOption = () => {
    const val = inputValue.trim();
    if (!val || sizes.includes(val)) { setInputValue(''); return; }
    onChange([...sizes, val]);
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeOption = (s) => onChange(sizes.filter(x => x !== s));

  if (isPredefined) {
    const sizeList = category === 'shoes' ? SHOE_SIZES : CLOTHING_SIZES;
    return (
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted-foreground">Click chips to toggle available sizes</p>
        <div className="flex flex-wrap gap-2">
          {sizeList.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              className={`px-4 py-2 font-mono text-sm font-bold border transition-all select-none ${
                sizes.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-foreground border-border hover:border-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {sizes.length > 0 && (
          <p className="font-mono text-[10px] text-primary">Selected: {sizes.join(', ')}</p>
        )}
      </div>
    );
  }

  // Dynamic custom options for all other categories
  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] text-muted-foreground">Add selectable options customers can choose from</p>
      {/* Existing options as removable tags */}
      {sizes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sizes.map(s => (
            <span key={s} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border font-mono text-xs">
              {s}
              <button type="button" onClick={() => removeOption(s)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      {/* Add new option */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomOption(); } }}
          placeholder='e.g. "500ml", "Red", "Pack of 3"'
          className="bg-secondary border-border h-10 flex-1"
        />
        <button
          type="button"
          onClick={addCustomOption}
          disabled={!inputValue.trim()}
          className="flex items-center gap-1 px-4 h-10 border border-primary text-primary font-mono text-xs hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

function ProductForm({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price || '',
    category: product?.category || 'electronics',
    description: product?.description || '',
    rating: product?.rating || 0,
    stock: product?.stock || 0,
    featured: product?.featured || false,
    tags: product?.tags || '',
    images: product?.images || [],
    sizes: product?.sizes || [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sizeError, setSizeError] = useState('');

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const setPrimaryImage = (idx) => {
    setForm(f => {
      const imgs = [...f.images];
      const [primary] = imgs.splice(idx, 1);
      return { ...f, images: [primary, ...imgs] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (PREDEFINED_CATEGORIES.includes(form.category) && form.sizes.length === 0) {
      setSizeError('Please select at least one available size.');
      return;
    }
    setSizeError('');
    setSaving(true);
    await onSave({
      ...form,
      price: parseFloat(form.price) || 0,
      rating: parseFloat(form.rating) || 0,
      stock: parseInt(form.stock) || 0,
      tags: form.tags,
      sizes: form.sizes,
    });
    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Name</label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border h-10" required />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Price ($)</label>
          <Input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="bg-secondary border-border h-10" required />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Category</label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v, sizes: [] })}>
            <SelectTrigger className="bg-secondary border-border h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Stock</label>
          <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="bg-secondary border-border h-10" />
        </div>
      </div>

      {/* Options — dynamic by category */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">
          {PREDEFINED_CATEGORIES.includes(form.category) ? 'Available Sizes' : 'Product Options'}
        </label>
        <SizeSelector
          category={form.category}
          sizes={form.sizes}
          onChange={sizes => { setSizeError(''); setForm(f => ({ ...f, sizes })); }}
        />
        {sizeError && <p className="font-mono text-xs text-destructive mt-1">{sizeError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Rating (0-5)</label>
          <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="bg-secondary border-border h-10" />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="accent-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase">Featured</span>
          </label>
        </div>
      </div>

      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Description</label>
        <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-secondary border-border min-h-[80px]" />
      </div>

      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Tags / Keywords</label>
        <Input
          value={form.tags}
          onChange={e => setForm({ ...form, tags: e.target.value })}
          placeholder="e.g. mechanical, gaming, A34, wireless"
          className="bg-secondary border-border h-10"
        />
        <p className="font-mono text-[10px] text-muted-foreground mt-1">Comma-separated keywords to improve search accuracy</p>
      </div>

      {/* Images */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Images</label>
        <p className="font-mono text-[10px] text-muted-foreground mb-2">Click ★ to set as the main (cover) photo. The first image is shown on the product listing.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 bg-secondary border overflow-hidden group"
              style={{ borderColor: i === 0 ? 'hsl(72,100%,50%)' : undefined }}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              {/* Primary badge */}
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-primary-foreground font-mono text-[8px] text-center py-0.5">
                  COVER
                </div>
              )}
              {/* Set primary button */}
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setPrimaryImage(i)}
                  className="absolute bottom-0 left-0 right-0 bg-black/60 text-yellow-300 font-mono text-[9px] text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ★ Set Cover
                </button>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="w-20 h-20 border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-muted-foreground transition-colors">
            <input type="file" accept="image/*" multiple onChange={handleUploadImages} className="hidden" />
            {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="font-mono border-border">Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-primary text-primary-foreground font-mono hover:bg-primary/90">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {product ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}

export default function AdminProducts() {
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
      toast.success('Product updated');
    } else {
      await base44.entities.Product.create(data);
      toast.success('Product created');
    }
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Product deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{products.length} total</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-primary text-primary-foreground font-mono hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" /> ADD PRODUCT
        </Button>
      </div>

      {/* Product list */}
      <div className="bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Product</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden sm:table-cell">Category</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase">Price</th>
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden md:table-cell">Stock</th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary border border-border overflow-hidden flex-shrink-0">
                        {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[200px]">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-muted-foreground uppercase">{product.category}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-primary">${product.price?.toFixed(2)}</td>
                  <td className="p-3 font-mono text-sm hidden md:table-cell">{product.stock || 0}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                        onClick={() => { setEditing(product); setShowForm(true); }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Product' : 'New Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editing}
            onClose={() => setShowForm(false)}
            onSave={handleSave}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}