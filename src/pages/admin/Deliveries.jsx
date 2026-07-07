import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Search, Bike, UserPlus, UserMinus, CheckCircle2, Clock,
  Banknote, Plus, X, Upload, Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ─── Partners tab: promote/demote users to the 'delivery' role ───────────────
function PartnersTab() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users-for-delivery'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });

  const setRole = async (userId, role) => {
    await base44.entities.User.update(userId, { role });
    queryClient.invalidateQueries({ queryKey: ['all-users-for-delivery'] });
    toast.success(role === 'delivery' ? 'Promoted to Delivery Partner' : 'Removed as Delivery Partner');
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const partners = filtered.filter(u => u.role === 'delivery');
  const others = filtered.filter(u => u.role !== 'delivery' && u.role !== 'admin');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-secondary border border-border px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-transparent text-sm outline-none w-full placeholder:text-muted-foreground"
        />
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Delivery Partners ({partners.length})</p>
        {isLoading ? (
          <div className="h-20 bg-secondary animate-pulse" />
        ) : partners.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-border">
            <p className="font-mono text-xs text-muted-foreground uppercase">No delivery partners yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {partners.map(u => (
              <div key={u.id} className="bg-card border border-border p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{u.full_name || '—'}</p>
                  <p className="font-mono text-xs text-muted-foreground">{u.email} {u.phone && `· ${u.phone}`}</p>
                </div>
                <button
                  onClick={() => setRole(u.id, 'user')}
                  className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserMinus className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground uppercase mb-3">Other Registered Users</p>
        <div className="bg-card border border-border divide-y divide-border max-h-96 overflow-y-auto">
          {others.map(u => (
            <div key={u.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{u.full_name || '—'}</p>
                <p className="font-mono text-xs text-muted-foreground">{u.email}</p>
              </div>
              <button
                onClick={() => setRole(u.id, 'delivery')}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Make Delivery Partner
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Start Delivery modal — admin creates a new inbound stock-pickup ─────────
// Nothing to do with customer orders: this is the "I have stock arriving,
// here's who's carrying it and who should pick it up" step.
function StartDeliveryModal({ deliveryPartners, onClose, onCreated }) {
  const [deliveryUserId, setDeliveryUserId] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPhotoUrl, setItemPhotoUrl] = useState(null);
  const [itemPreview, setItemPreview] = useState(null);
  const [proofPhotoUrl, setProofPhotoUrl] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [carrierName, setCarrierName] = useState('');
  const [carrierPhone, setCarrierPhone] = useState('');
  const [cashToCarrier, setCashToCarrier] = useState('');
  const [customsTax, setCustomsTax] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadingItem, setUploadingItem] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const uploadTo = async (file, setUrl, setPreview, setUploading) => {
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const { file_url } = await base44.integrations.Core.UploadFile({ file, folder: 'deliveries' });
    setUrl(file_url);
    setUploading(false);
  };

  const canSubmit = deliveryUserId && itemName.trim() && itemPhotoUrl && proofPhotoUrl && carrierName.trim() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const partner = deliveryPartners.find(p => p.id === deliveryUserId);
      await base44.entities.DeliveryAssignment.create({
        delivery_user_id: deliveryUserId,
        delivery_user_name: partner?.full_name || partner?.email || '',
        delivery_user_email: partner?.email || '',
        item_name: itemName.trim(),
        item_photo_url: itemPhotoUrl,
        ownership_proof_photo_url: proofPhotoUrl,
        carrier_name: carrierName.trim(),
        carrier_phone: carrierPhone.trim(),
        cash_to_carrier: Number(cashToCarrier) || 0,
        customs_tax: Number(customsTax) || 0,
        notes: notes.trim(),
        status: 'assigned',
      });
      toast.success(`Delivery started — assigned to ${partner?.full_name || partner?.email}`);
      onCreated();
    } catch (err) {
      toast.error(err.data?.error || err.message || 'Failed to start delivery');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 overflow-y-auto py-8" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-lg p-6 space-y-4 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Start Delivery</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          Stock coming in from a carrier — assign a delivery partner to pick it up. Not linked to any customer order.
        </p>

        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Assign To *</label>
          <select
            value={deliveryUserId}
            onChange={e => setDeliveryUserId(e.target.value)}
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none"
          >
            <option value="">Select delivery partner…</option>
            {deliveryPartners.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
          {deliveryPartners.length === 0 && (
            <p className="font-mono text-[10px] text-destructive mt-1">No delivery partners yet — promote one in the Partners tab first.</p>
          )}
        </div>

        <div>
          <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">What's Coming In *</label>
          <input
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            placeholder="e.g. iPhone 15 Case x50"
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Product Photo *</label>
            {itemPreview ? (
              <div className="relative">
                <img src={itemPreview} alt="" className="w-full h-28 object-cover border border-border" />
                <button onClick={() => { setItemPreview(null); setItemPhotoUrl(null); }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border border-dashed border-border bg-secondary/40 cursor-pointer hover:border-primary/50 transition-colors gap-1.5">
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadTo(e.target.files[0], setItemPhotoUrl, setItemPreview, setUploadingItem)} />
                {uploadingItem ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="font-mono text-[10px] text-muted-foreground">Upload photo</span>
              </label>
            )}
          </div>
          <div>
            <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Ownership Proof Photo *</label>
            {proofPreview ? (
              <div className="relative">
                <img src={proofPreview} alt="" className="w-full h-28 object-cover border border-border" />
                <button onClick={() => { setProofPreview(null); setProofPhotoUrl(null); }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-28 border border-dashed border-border bg-secondary/40 cursor-pointer hover:border-primary/50 transition-colors gap-1.5">
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadTo(e.target.files[0], setProofPhotoUrl, setProofPreview, setUploadingProof)} />
                {uploadingProof ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="font-mono text-[10px] text-muted-foreground">Upload photo</span>
              </label>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <p className="font-mono text-xs text-muted-foreground uppercase">Carrier (who's bringing it)</p>
          <input
            value={carrierName}
            onChange={e => setCarrierName(e.target.value)}
            placeholder="Carrier name *"
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <input
            value={carrierPhone}
            onChange={e => setCarrierPhone(e.target.value)}
            placeholder="Carrier phone"
            className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={cashToCarrier}
              onChange={e => setCashToCarrier(e.target.value)}
              placeholder="Cash to carrier (Birr)"
              className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
            <input
              type="number"
              value={customsTax}
              onChange={e => setCustomsTax(e.target.value)}
              placeholder="Customs tax (Birr)"
              className="w-full bg-secondary border border-border h-10 px-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes for the delivery partner (optional)"
            rows={2}
            className="w-full bg-secondary border border-border px-3 py-2 text-sm outline-none placeholder:text-muted-foreground resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-11 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4" />}
          Start Delivery
        </button>
      </div>
    </div>
  );
}

// ─── Assignments tab: every inbound pickup across all couriers ──────────────
function AssignmentsTab({ deliveryPartners }) {
  const [filter, setFilter] = useState('assigned');
  const [showStart, setShowStart] = useState(false);
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['all-delivery-assignments', filter],
    queryFn: () => base44.entities.DeliveryAssignment.filter({ status: filter }, '-created_date', 200),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 border-b border-border">
          {['assigned', 'received'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-mono text-xs uppercase transition-colors border-b-2 -mb-px ${
                filter === s ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {s === 'assigned' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {s === 'assigned' ? 'Pending Pickup' : 'Received'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowStart(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 text-primary font-mono text-xs uppercase hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Start Delivery
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary animate-pulse" />)}</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <Bike className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-mono text-xs text-muted-foreground uppercase">No {filter} deliveries</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => (
            <div key={a.id} className="bg-card border border-border p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm font-semibold">{a.item_name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {a.created_date ? format(new Date(a.created_date), 'MMM d, yyyy HH:mm') : ''}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Delivery Partner</p>
                  <p className="font-semibold">{a.delivery_user_name || a.delivery_user_email || '—'}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Carrier</p>
                  <p>{a.carrier_name || '—'} {a.carrier_phone && <span className="font-mono text-xs text-muted-foreground">· {a.carrier_phone}</span>}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase">Money</p>
                  <p className="flex items-center gap-1.5 font-mono text-xs">
                    <Banknote className="w-3.5 h-3.5 text-yellow-400" />
                    Carrier: {a.cash_to_carrier || 0} Birr · Tax: {a.customs_tax || 0} Birr
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {a.item_photo_url && (
                  <a href={a.item_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.item_photo_url} alt="Item" className="w-16 h-16 object-cover border border-border" />
                  </a>
                )}
                {a.ownership_proof_photo_url && (
                  <a href={a.ownership_proof_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.ownership_proof_photo_url} alt="Ownership proof" className="w-16 h-16 object-cover border border-yellow-400/40" />
                  </a>
                )}
                {a.received_photo_url && (
                  <a href={a.received_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={a.received_photo_url} alt="Received proof" className="w-16 h-16 object-cover border border-primary/40" />
                  </a>
                )}
              </div>
              {a.notes && <p className="text-xs text-muted-foreground italic">"{a.notes}"</p>}
            </div>
          ))}
        </div>
      )}

      {showStart && (
        <StartDeliveryModal
          deliveryPartners={deliveryPartners}
          onClose={() => setShowStart(false)}
          onCreated={() => {
            setShowStart(false);
            queryClient.invalidateQueries({ queryKey: ['all-delivery-assignments'] });
          }}
        />
      )}
    </div>
  );
}

export default function AdminDeliveries() {
  const [tab, setTab] = useState('assignments');

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-delivery'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
  });
  const deliveryPartners = allUsers.filter(u => u.role === 'delivery');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Deliveries</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">Inbound stock pickups — separate from customer order fulfillment</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[{ key: 'assignments', label: 'Assignments' }, { key: 'partners', label: 'Partners' }].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-mono text-xs uppercase transition-colors border-b-2 -mb-px ${
              tab === t.key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'assignments' ? <AssignmentsTab deliveryPartners={deliveryPartners} /> : <PartnersTab />}
    </div>
  );
}
