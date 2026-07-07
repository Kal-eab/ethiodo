import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPortal } from 'react-dom';
import { Bike, Phone, MapPin, Upload, X, Loader2, CheckCircle2, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Navbar from '@/components/store/Navbar';

// ─── Mark Received modal — requires a photo as proof the courier physically
// collected the package from the carrier ────────────────────────────────────
function MarkReceivedModal({ assignment, onClose, onDone }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    const { file_url } = await base44.integrations.Core.UploadFile({ file, folder: 'deliveries' });
    setPhotoUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!photoUrl) { toast.error('Please add a photo of the package'); return; }
    setSubmitting(true);
    try {
      await base44.entities.DeliveryAssignment.update(assignment.id, {
        status: 'received',
        received_photo_url: photoUrl,
        received_at: new Date().toISOString(),
      });
      toast.success('Marked as received!');
      onDone();
    } catch (err) {
      toast.error(err.data?.error || err.message || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase">Confirm Pickup</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Take a photo of the package you collected from the carrier as proof.</p>

        {preview ? (
          <div className="relative">
            <img src={preview} alt="" className="w-full h-48 object-cover border border-border" />
            <button onClick={() => { setPreview(null); setPhotoUrl(null); }}
              className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-36 border border-dashed border-border bg-secondary/40 cursor-pointer hover:border-primary/50 transition-colors gap-2">
            <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
            <span className="font-mono text-xs text-muted-foreground">{uploading ? 'Uploading…' : 'Take / choose photo'}</span>
          </label>
        )}

        <button
          onClick={handleSubmit}
          disabled={!photoUrl || submitting}
          className="w-full h-11 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Confirm Received
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ─── Single assignment card ──────────────────────────────────────────────────
function AssignmentCard({ assignment }) {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  return (
    <div className="bg-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-secondary/20 flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">ORDER #{assignment.order_id?.slice(-8).toUpperCase()}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {assignment.created_date ? format(new Date(assignment.created_date), 'MMM d, HH:mm') : ''}
        </p>
      </div>

      <div className="p-5 space-y-4">
        {/* Items to deliver */}
        <div className="space-y-2">
          {(assignment.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-secondary border border-border flex-shrink-0 overflow-hidden">
                {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product_name}</p>
                <p className="font-mono text-xs text-muted-foreground">×{item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Reference photo from the carrier */}
        {assignment.reference_photo_url && (
          <img src={assignment.reference_photo_url} alt="Reference" className="w-full max-h-40 object-cover border border-border" />
        )}

        {/* Carrier contact */}
        <div className="bg-secondary/40 p-3 space-y-1.5">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Collect From</p>
          <p className="text-sm font-semibold">{assignment.carrier_name || '—'}</p>
          {assignment.carrier_phone && (
            <a href={`tel:${assignment.carrier_phone}`} className="flex items-center gap-1.5 text-primary text-sm font-mono">
              <Phone className="w-3.5 h-3.5" /> {assignment.carrier_phone}
            </a>
          )}
        </div>

        {/* Money owed */}
        {(assignment.cash_to_carrier > 0 || assignment.customs_tax > 0) && (
          <div className="flex items-center gap-2 border border-yellow-400/30 bg-yellow-400/5 p-3">
            <Banknote className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div className="font-mono text-xs space-y-0.5">
              {assignment.cash_to_carrier > 0 && <p>Pay carrier: <span className="font-bold text-yellow-300">{assignment.cash_to_carrier} Birr</span></p>}
              {assignment.customs_tax > 0 && <p>Customs tax: <span className="font-bold text-yellow-300">{assignment.customs_tax} Birr</span></p>}
            </div>
          </div>
        )}

        {assignment.notes && (
          <p className="text-xs text-muted-foreground italic">"{assignment.notes}"</p>
        )}

        {/* Deliver to */}
        <div className="border-t border-border pt-3 space-y-1">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Deliver To</p>
          <p className="text-sm font-semibold">{assignment.customer_name || '—'}</p>
          {assignment.customer_phone && (
            <a href={`tel:${assignment.customer_phone}`} className="flex items-center gap-1.5 text-muted-foreground text-sm font-mono">
              <Phone className="w-3.5 h-3.5" /> {assignment.customer_phone}
            </a>
          )}
          {assignment.delivery_address && (
            <p className="flex items-start gap-1.5 text-muted-foreground text-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {assignment.delivery_address}
            </p>
          )}
        </div>

        {assignment.status === 'assigned' ? (
          <button
            onClick={() => setShowModal(true)}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-xs uppercase font-bold hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Received
          </button>
        ) : (
          <div className="flex items-center gap-2 border border-primary/30 bg-primary/5 p-2.5">
            <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="font-mono text-xs text-primary">
              Received {assignment.received_at ? format(new Date(assignment.received_at), 'MMM d, HH:mm') : ''}
            </p>
            {assignment.received_photo_url && (
              <img src={assignment.received_photo_url} alt="" className="w-8 h-8 object-cover border border-border ml-auto" />
            )}
          </div>
        )}
      </div>

      {showModal && (
        <MarkReceivedModal
          assignment={assignment}
          onClose={() => setShowModal(false)}
          onDone={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['my-deliveries'] });
          }}
        />
      )}
    </div>
  );
}

// ─── Main Deliveries page (for users with role === 'delivery') ───────────────
export default function Deliveries() {
  const { user, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assigned');

  useEffect(() => {
    if (!isLoadingAuth && user && user.role !== 'delivery' && user.role !== 'admin') navigate('/');
    if (!isLoadingAuth && !user) navigate('/');
  }, [isLoadingAuth, user, navigate]);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-deliveries', user?.id],
    queryFn: () => base44.entities.DeliveryAssignment.filter({ delivery_user_id: user.id }, '-created_date', 100),
    enabled: !!user?.id,
  });

  const tabAssignments = assignments.filter(a => a.status === activeTab);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-14 pb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold mb-1">My Deliveries</h1>
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-6">Pick up from carriers, deliver to customers</p>

          <div className="flex gap-1 mb-8 border-b border-border">
            {['assigned', 'received'].map(s => {
              const count = assignments.filter(a => a.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`px-4 py-2.5 font-mono text-xs uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === s ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s === 'assigned' ? 'To Pick Up' : 'Completed'}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${activeTab === s ? 'text-primary border-primary/30 bg-primary/5' : 'text-muted-foreground border-border'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-40 bg-secondary animate-pulse" />)}
            </div>
          ) : tabAssignments.length === 0 ? (
            <div className="text-center py-24 space-y-3">
              <Bike className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="font-mono text-muted-foreground text-sm">
                {activeTab === 'assigned' ? 'NOTHING TO PICK UP' : 'NO COMPLETED DELIVERIES'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tabAssignments.map(a => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
