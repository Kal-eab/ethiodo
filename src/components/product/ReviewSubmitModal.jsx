import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Star, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { StarRating } from './ReviewSection';
import { playNotificationSound } from '@/lib/notificationSound';

const MIN_CHARS = 10;
const MAX_PHOTOS = 4;

// Post-delivery, verified-buyer review modal — one per order item.
// Submits to the dedicated /api/reviews endpoint (server/src/routes/reviews.js),
// which enforces delivered-only / buyer-only / one-per-item rules server-side.
export default function ReviewSubmitModal({ item, order, onClose, onSubmitted }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', item.product_id] });
      playNotificationSound();
      toast.success('Review submitted! It will appear after moderation.');
      onSubmitted?.();
    } catch (err) {
      toast.error(err.data?.error || err.message || 'Failed to submit review');
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

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
