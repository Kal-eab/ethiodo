import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Upload, X, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { StarRating } from './ReviewSection';
import { playNotificationSound } from '@/lib/notificationSound';
import { useAuth } from '@/lib/AuthContext';

const MIN_CHARS = 10;
const MAX_PHOTOS = 4;

// Post-delivery, verified-buyer review modal — one per order item.
// Submits to the dedicated /api/reviews endpoint (server/src/routes/reviews.js),
// which enforces delivered-only / buyer-only / one-per-item rules server-side.
export default function ReviewSubmitModal({ item, order, onClose, onSubmitted }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const bodyValid = body.trim().length >= MIN_CHARS;
  const photosValid = photos.length >= 1;
  const canSubmit = bodyValid && photosValid && !uploading && !submitting;

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, MAX_PHOTOS - photos.length);
    if (!files.length) return;
    setPhotos((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((p) => p.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      setUploading(true);
      const urls = [];
      for (const file of photos) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file, folder: 'reviews' });
        urls.push(file_url);
      }
      setUploading(false);

      await base44.reviews.submit({
        product_id: item.product_id,
        order_id: order.id,
        rating,
        body: body.trim(),
        photos: urls,
      });

      // The review is in — celebrate immediately. Anything after this point is
      // best-effort and must NOT be able to suppress the thank-you screen.
      // NB: do NOT refetch ['my-orders'] here — once the order becomes fully
      // reviewed it drops out of the "delivered" tab, which unmounts this very
      // modal (and its thank-you screen). The refetch runs on dismiss instead,
      // via onSubmitted → onReviewed in Orders.jsx.
      queryClient.invalidateQueries({ queryKey: ['reviews', item.product_id] });
      playNotificationSound();
      setSubmitted(true);

      // Drop a thank-you into the buyer's support chat. The Messages page keys
      // the chat on the logged-in user's email (conversation_id === user.email)
      // and the Message read RLS requires user_email === user.email — so we use
      // the authenticated user's email, NOT order.customer_email (free-text
      // contact) or order.created_by (may be blank on imported orders).
      const buyerEmail = user?.email || order.created_by || order.customer_email;
      if (buyerEmail) {
        try {
          await base44.entities.Message.create({
            conversation_id: buyerEmail,
            user_email: buyerEmail,
            user_name: user?.full_name || order.customer_name || buyerEmail,
            content: `Thank you so much for your review! 💚 It means the world to us. We're truly happy to serve you — see you next time! 🎉`,
            sender: 'admin',
            is_read: false,
          });
          queryClient.invalidateQueries({ queryKey: ['my-messages', buyerEmail] });
          queryClient.invalidateQueries({ queryKey: ['my-messages-check', buyerEmail] });
        } catch (msgErr) {
          console.error('Failed to send review thank-you message:', msgErr);
        }
      }
    } catch (err) {
      toast.error(err.data?.error || err.message || 'Failed to submit review');
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  const CONFETTI = ['bg-primary', 'bg-accent', 'bg-primary', 'bg-accent', 'bg-primary', 'bg-accent'];

  if (submitted) {
    const thankYou = (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => onSubmitted?.()}>
        <div
          className="relative bg-card border border-border w-full max-w-md overflow-hidden animate-thankyou-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Confetti */}
          <div className="pointer-events-none absolute inset-x-0 top-16 flex justify-center gap-3">
            {CONFETTI.map((c, i) => (
              <span
                key={i}
                className={`w-2 h-3 ${c} animate-thankyou-confetti`}
                style={{ animationDelay: `${0.15 + i * 0.06}s` }}
              />
            ))}
          </div>

          <div className="px-8 py-10 flex flex-col items-center text-center">
            {/* Animated check badge */}
            <div className="relative mb-6">
              <span className="absolute inset-0 rounded-full border-2 border-primary animate-thankyou-ring" />
              <span className="absolute inset-0 rounded-full border-2 border-primary animate-thankyou-ring" style={{ animationDelay: '0.25s' }} />
              <div className="relative w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="w-11 h-11">
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    stroke="hsl(var(--primary-foreground))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-thankyou-check"
                  />
                </svg>
              </div>
            </div>

            <div className="flex gap-1 mb-4 animate-thankyou-rise" style={{ animationDelay: '0.35s' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-primary text-primary" />
              ))}
            </div>

            <h2 className="text-2xl font-black mb-3 animate-thankyou-rise" style={{ animationDelay: '0.4s' }}>
              Thank You 💚
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs animate-thankyou-rise" style={{ animationDelay: '0.5s' }}>
              Your words mean the world to us. From our whole team — thank you for
              trusting us and taking the time to share your experience.
              <span className="block mt-2 text-foreground font-medium">
                We're truly happy to serve you, and we can't wait to see you again. 🎉
              </span>
            </p>

            <p className="font-mono text-[10px] text-muted-foreground uppercase mt-6 animate-thankyou-rise" style={{ animationDelay: '0.6s' }}>
              Your review will appear after moderation
            </p>

            <button
              type="button"
              onClick={() => onSubmitted?.()}
              className="mt-6 w-full h-11 bg-primary text-primary-foreground font-mono font-bold uppercase hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors animate-thankyou-rise"
              style={{ animationDelay: '0.7s' }}
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>
        </div>
      </div>
    );
    return createPortal(thankYou, document.body);
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-card border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-bold text-base">Write a Review</h2>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{item.product_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Your Rating</p>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Your Review *</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell others what you think..."
              rows={4}
              className="w-full bg-secondary border border-border px-4 py-3 text-sm outline-none placeholder:text-muted-foreground resize-none focus:border-primary/50 transition-colors"
            />
            <p className={`font-mono text-[10px] mt-1 ${bodyValid ? 'text-muted-foreground' : 'text-destructive'}`}>
              {bodyValid ? `${body.trim().length} chars` : `MIN ${MIN_CHARS} CHARACTERS (${body.trim().length}/${MIN_CHARS})`}
            </p>
          </div>

          <div>
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">Photos * (1–{MAX_PHOTOS})</p>
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative w-20 h-20 border border-border overflow-hidden">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-destructive text-destructive-foreground p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="w-20 h-20 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors gap-1">
                  <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                  <span className="font-mono text-[9px] text-muted-foreground">ADD</span>
                </label>
              )}
            </div>
            <p className={`font-mono text-[10px] mt-1 ${photosValid ? 'text-muted-foreground' : 'text-destructive'}`}>
              {photosValid ? `${photos.length}/${MAX_PHOTOS} photos` : 'ADD AT LEAST 1 PHOTO'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-11 bg-primary text-primary-foreground font-mono font-bold uppercase hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {(uploading || submitting) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
            {uploading ? 'Uploading Photos...' : submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
