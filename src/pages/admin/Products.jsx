import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const CATEGORIES = ['electronics', 'foods', 'hygiene', 'clothing', 'accessories', 'home', 'sports', 'other'];

function ProductForm({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price || '',
    category: product?.category || 'electronics',
    description: product?.description || '',
    rating: product?.rating || 0,
    stock: product?.stock || 0,
    featured: product?.featured || false,
    images: product?.images || [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      price: parseFloat(form.price) || 0,
      rating: parseFloat(form.rating) || 0,
      stock: parseInt(form.stock) || 0,
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
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
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

      {/* Images */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Images</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 bg-secondary border border-border overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
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