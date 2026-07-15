import React, { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Upload, X, Loader2, FileText, CheckCircle2, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getCategoryTreeDynamic, getCategoryLabel } from '@/lib/categories';
import { isTestProduct, TEST_BADGE_CLASS } from '@/lib/testMode';
import OptionGroupsEditor from '@/components/admin/OptionGroupsEditor';
import { getOptionGroups, uploadProductImage } from '@/lib/productOptions';

function ProductForm({ product, onClose, onSave }) {
  const CATEGORY_TREE = getCategoryTreeDynamic();
  const [form, setForm] = useState({
    name: product?.name || '',
    price: product?.price || '',
    profit: product?.profit || '',
    category: product?.category || 'electronics',
    description: product?.description || '',
    rating: product?.rating || 0,
    stock: product?.stock || 0,
    featured: product?.featured || false,
    coming_soon: product?.coming_soon || false,
    tags: product?.tags || '',
    images: product?.images || [],
    sizes: product?.sizes || [],
    // Legacy `sizes` get converted into a group automatically the first time
    // this product is edited.
    option_groups: getOptionGroups(product),
    is_test_product: product?.is_test_product || false,
    test_notes: product?.test_notes || '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    // Reset input so the same file can be selected again
    e.target.value = '';
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        urls.push(await uploadProductImage(file));
      }
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    } catch (err) {
      toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
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

  const handleDragStart = (idx) => { dragItem.current = idx; };
  const handleDragEnter = (idx) => { dragOver.current = idx; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null || dragItem.current === dragOver.current) return;
    setForm(f => {
      const imgs = [...f.images];
      const [dragged] = imgs.splice(dragItem.current, 1);
      imgs.splice(dragOver.current, 0, dragged);
      dragItem.current = null;
      dragOver.current = null;
      return { ...f, images: imgs };
    });
  };

  const handleSubmit = async (e, publish) => {
    e.preventDefault();
    setSizeError('');

    // Drop groups the admin added but never filled, then validate the rest:
    // each surviving group needs a name and at least one value.
    const groups = (form.option_groups || []).filter(
      g => g.name.trim() || (g.values && g.values.length > 0)
    );
    for (const g of groups) {
      if (!g.name.trim()) { setSizeError('Please give every option group a name.'); return; }
      if (!g.values || g.values.length === 0) {
        setSizeError(`Group "${g.name}" needs at least one value.`); return;
      }
    }
    // Mirror the first group's labels into the legacy `sizes` array so any
    // code still reading `sizes` keeps working.
    const mirroredSizes = groups[0]?.values.map(v => v.label) ?? [];

    setSaving(true);
    await onSave({
      ...form,
      price: parseFloat(form.price) || 0,
      profit: form.profit !== '' ? parseFloat(form.profit) : undefined,
      rating: parseFloat(form.rating) || 0,
      stock: parseInt(form.stock) || 0,
      tags: form.tags,
      option_groups: groups,
      sizes: mirroredSizes,
      coming_soon: form.coming_soon,
      published: publish,
      is_test_product: form.is_test_product,
      test_notes: form.is_test_product ? form.test_notes : '',
      // Stamped the first time the product is marked as test, so the admin can
      // see how long a test product has been lying around.
      test_created_at: form.is_test_product
        ? (product?.test_created_at || new Date().toISOString())
        : null,
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
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Profit (Birr)</label>
          <Input type="number" step="0.01" value={form.profit} onChange={e => setForm({ ...form, profit: e.target.value })} className="bg-secondary border-border h-10" placeholder="Optional — profit per unit" />
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Category</label>
          <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
            <SelectTrigger className="bg-secondary border-border h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_TREE.map(parent => (
                <React.Fragment key={parent.value}>
                  <SelectItem value={parent.value}>
                    <span className="font-semibold">{parent.label}</span>
                  </SelectItem>
                  {parent.subcategories.map(sub => (
                    <SelectItem key={sub.value} value={sub.value}>
                      <span className="pl-3 text-muted-foreground">↳ {sub.label}</span>
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Stock</label>
          <Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="bg-secondary border-border h-10" />
        </div>
      </div>

      {/* Product options / variants */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">
          Product Options
        </label>
        <OptionGroupsEditor
          value={form.option_groups}
          category={form.category}
          onChange={groups => { setSizeError(''); setForm(f => ({ ...f, option_groups: groups })); }}
        />
        {sizeError && <p className="font-mono text-xs text-destructive mt-1">{sizeError}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">Rating (0-5)</label>
          <Input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} className="bg-secondary border-border h-10" />
        </div>
        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} className="accent-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase">Featured</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.coming_soon} onChange={e => setForm({ ...form, coming_soon: e.target.checked })} className="accent-primary" />
            <span className="font-mono text-xs text-muted-foreground uppercase">Show as Coming Soon</span>
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
            <div
              key={url}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="relative w-20 h-20 bg-secondary border overflow-hidden group cursor-grab active:cursor-grabbing select-none"
              style={{ borderColor: i === 0 ? 'hsl(72,100%,50%)' : undefined }}
            >
              <img src={url} alt="" className="w-full h-full object-cover pointer-events-none" />
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

      {/* ── Testing options ── */}
      <div className="border border-orange-400/30 bg-orange-400/5 p-4 space-y-3">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
          <FlaskConical className="w-3.5 h-3.5" /> Testing Options
        </p>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_test_product}
            onChange={e => setForm({ ...form, is_test_product: e.target.checked })}
            className="w-4 h-4 accent-orange-400"
          />
          <span className="text-sm font-medium">Mark as Test Product</span>
        </label>

        <ul className="font-mono text-[11px] text-muted-foreground space-y-0.5 pl-6 list-disc">
          <li>Hidden from all customers — not listed, not searchable, 404 on a direct link</li>
          <li>Only you can order it, so you can test a flow end to end</li>
          <li>Its orders, reviews and ratings never reach your dashboard metrics</li>
        </ul>

        {form.is_test_product && (
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Test Notes (optional)
            </label>
            <Textarea
              value={form.test_notes}
              onChange={e => setForm({ ...form, test_notes: e.target.value })}
              className="bg-secondary border-border"
              rows={2}
              placeholder="What are you testing? e.g. 10% → 90% partial payment flow"
            />
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-2 flex-wrap">
        <Button type="button" variant="outline" onClick={onClose} className="font-mono border-border">Cancel</Button>
        <Button
          type="button"
          disabled={saving}
          onClick={e => handleSubmit(e, false)}
          className="bg-secondary text-foreground border border-border font-mono hover:bg-secondary/80 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Save as Draft
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={e => handleSubmit(e, true)}
          className="bg-primary text-primary-foreground font-mono hover:bg-primary/90 flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Publish
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
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list('-created_date', 200),
  });

  const handleSave = async (data) => {
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
      toast.success(data.published ? 'Product published!' : 'Draft saved');
    } else {
      await base44.entities.Product.create(data);
      toast.success(data.published ? 'Product published!' : 'Draft saved');
    }
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const handleTogglePublish = async (product) => {
    const newVal = !product.published;
    if (newVal && (!product.name || !product.price || !product.images?.length)) {
      toast.error('Product needs a name, price, and at least one photo to publish.');
      return;
    }
    await base44.entities.Product.update(product.id, { published: newVal });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    toast.success(newVal ? 'Product published!' : 'Moved to draft');
  };

  const handleToggleTest = async (product) => {
    const makeTest = !isTestProduct(product);
    if (!makeTest && !window.confirm('Make this product live? It becomes visible to customers immediately.')) return;
    await base44.entities.Product.update(product.id, {
      is_test_product: makeTest,
      test_created_at: makeTest ? (product.test_created_at || new Date().toISOString()) : null,
      // Orders already placed against it keep their is_test_order flag, so
      // going live never back-fills test data into your revenue.
    });
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    toast.success(makeTest ? 'Marked as test — hidden from customers' : 'Product is now live');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await base44.entities.Product.delete(id);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    toast.success('Product deleted');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            {products.length} total · <span className="text-primary">{products.filter(p => p.published).length} published</span> · <span className="text-muted-foreground">{products.filter(p => !p.published).length} drafts</span>
            {products.filter(isTestProduct).length > 0 && (
              <> · <span className="text-orange-400">{products.filter(isTestProduct).length} test</span></>
            )}
          </p>
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
                <th className="text-left p-3 font-mono text-xs text-muted-foreground uppercase hidden sm:table-cell">Status</th>
                <th className="text-right p-3 font-mono text-xs text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map(product => (
                <tr key={product.id} className={`hover:bg-secondary/30 transition-colors ${!product.published ? 'opacity-70' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-secondary border border-border overflow-hidden flex-shrink-0 relative">
                        {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                        {!product.published && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <FileText className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isTestProduct(product) && (
                            <span className={TEST_BADGE_CLASS} title={product.test_notes || 'Test product — hidden from customers'}>
                              <FlaskConical className="w-2.5 h-2.5" /> Test
                            </span>
                          )}
                          <span className="text-sm font-medium truncate max-w-[200px]">{product.name}</span>
                        </div>
                        {isTestProduct(product) && product.test_notes && (
                          <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[220px]">{product.test_notes}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-muted-foreground uppercase">{getCategoryLabel(product.category)}</span>
                  </td>
                  <td className="p-3 font-mono font-bold text-primary">${product.price?.toFixed(2)}</td>
                  <td className="p-3 font-mono text-sm hidden md:table-cell">{product.stock || 0}</td>
                  <td className="p-3 hidden sm:table-cell">
                    {isTestProduct(product) ? (
                      <button
                        onClick={() => handleToggleTest(product)}
                        className="flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase border border-orange-400/40 bg-orange-400/10 text-orange-400 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors"
                        title="Make this product live and visible to customers"
                      >
                        <FlaskConical className="w-3 h-3" /> Make Live
                      </button>
                    ) : (
                    <button
                      onClick={() => handleTogglePublish(product)}
                      className={`flex items-center gap-1.5 px-2 py-1 font-mono text-[10px] uppercase border transition-colors ${
                        product.published
                          ? 'bg-primary/10 border-primary/30 text-primary hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive'
                          : 'bg-secondary border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-primary'
                      }`}
                    >
                      {product.published ? <><CheckCircle2 className="w-3 h-3" /> Published</> : <><FileText className="w-3 h-3" /> Draft</>}
                    </button>
                    )}
                  </td>
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