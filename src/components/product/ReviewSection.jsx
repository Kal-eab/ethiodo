import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle, Upload, X, Loader2, ThumbsUp, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';

function StarRating({ value, onChange, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={() => onChange && onChange(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star className={`${sz} ${(hover || value) >= i ? 'fill-primary text-primary' : 'text-border'} transition-colors`} />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="bg-card border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {(review.reviewer_name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{review.reviewer_name || 'Anonymous'}</p>
              {review.verified_buyer && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-accent border border-accent/30 px-1.5 py-0.5 bg-accent/5">
                  <CheckCircle className="w-3 h-3" /> Verified Buyer
                </span>
              )}
              {review.featured && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary border border-primary/30 px-1.5 py-0.5 bg-primary/5">
                  ★ Featured
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              {review.created_date ? format(new Date(review.created_date), 'MMM d, yyyy') : ''}
            </p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      {review.title && <p className="font-semibold text-sm">{review.title}</p>}
      <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
      {/* Photos */}
      {review.photos?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.photos.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt={`review-photo-${i}`} className="h-20 w-20 object-cover border border-border hover:opacity-80 transition-opacity" />
            </a>
          ))}
        </div>
      )}
      {/* Videos */}
      {review.videos?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {review.videos.map((url, i) => (
            <video key={i} src={url} controls className="h-32 w-auto border border-border rounded" />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productId, orderId, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ rating: 5, title: '', body: '' });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handlePhotoAdd = (e) => {
    const files = Array.from(e.target.files);
    setPhotos(p => [...p, ...files]);
    setPhotoPreviews(p => [...p, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removePhoto = (i) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPhotoPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleVideoAdd = (e) => {
    const files = Array.from(e.target.files);
    setVideos(v => [...v, ...files]);
    setVideoPreviews(v => [...v, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeVideo = (i) => {
    setVideos(v => v.filter((_, idx) => idx !== i));
    setVideoPreviews(v => v.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.body.trim()) return;
    setSubmitting(true);

    const uploadedPhotos = [];
    for (const file of photos) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedPhotos.push(file_url);
    }

    const uploadedVideos = [];
    for (const file of videos) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedVideos.push(file_url);
    }

    await base44.entities.Review.create({
      product_id: productId,
      order_id: orderId || '',
      rating: form.rating,
      title: form.title.trim(),
      body: form.body.trim(),
      photos: uploadedPhotos,
      videos: uploadedVideos,
      reviewer_name: user?.full_name || user?.email || 'Anonymous',
      reviewer_email: user?.email || '',
      verified_buyer: !!orderId,
      status: 'pending',
      featured: false,
    });

    queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
    toast.success('Review submitted! It will appear after moderation.');
    setSubmitting(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">Write a Review</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase block mb-2">Your Rating</label>
        <StarRating value={form.rating} onChange={r => setForm({ ...form, rating: r })} size="lg" />
      </div>

      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Review Title (optional)</label>
        <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sum up your experience..." className="bg-secondary border-border h-11" />
      </div>

      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase block mb-1.5">Your Review *</label>
        <Textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Tell others what you think..." rows={4} required className="bg-secondary border-border resize-none" />
      </div>

      {/* Photos */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase block mb-2">Add Photos (optional)</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {photoPreviews.map((url, i) => (
            <div key={i} className="relative">
              <img src={url} alt="" className="w-16 h-16 object-cover border border-border" />
              <button type="button" onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <label className="w-16 h-16 border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
            <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} className="hidden" />
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </label>
        </div>
      </div>

      {/* Videos */}
      <div>
        <label className="font-mono text-xs text-muted-foreground uppercase block mb-2">Add Videos (optional)</label>
        <div className="flex gap-2 flex-wrap mb-2">
          {videoPreviews.map((url, i) => (
            <div key={i} className="relative">
              <video src={url} className="w-20 h-16 object-cover border border-border" />
              <button type="button" onClick={() => removeVideo(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <label className="w-20 h-16 border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
            <input type="file" accept="video/*" multiple onChange={handleVideoAdd} className="hidden" />
            <Upload className="w-4 h-4 text-muted-foreground" />
          </label>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">Short videos only (up to 50MB)</p>
      </div>

      <Button type="submit" disabled={submitting || !form.body.trim()} className="w-full h-11 bg-primary text-primary-foreground font-mono hover:bg-primary/90">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading & Submitting...</> : 'Submit Review'}
      </Button>
      {orderId && <p className="text-center font-mono text-[10px] text-accent">✓ You'll receive a Verified Buyer badge</p>}
    </form>
  );
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'media', label: 'With Photos/Videos' },
];

export default function ReviewSection({ productId, userOrders = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [sort, setSort] = useState('latest');

  const verifiedOrderId = userOrders.find(o =>
    o.items?.some(i => i.product_id === productId) && o.status === 'delivered'
  )?.id;

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => base44.entities.Review.filter({ product_id: productId, status: 'approved' }, '-created_date', 50),
    enabled: !!productId,
  });

  const featured = reviews.filter(r => r.featured);
  const rest = reviews.filter(r => !r.featured);

  const sorted = [...rest].sort((a, b) => {
    if (sort === 'highest') return (b.rating || 0) - (a.rating || 0);
    if (sort === 'media') {
      const aHas = (a.photos?.length || 0) + (a.videos?.length || 0);
      const bHas = (b.photos?.length || 0) + (b.videos?.length || 0);
      return bHas - aHas;
    }
    return (b.created_date || '').localeCompare(a.created_date || '');
  });

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const withMedia = reviews.filter(r => r.photos?.length || r.videos?.length).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <StarRating value={Math.round(avgRating)} />
              <span className="font-mono text-sm text-muted-foreground">{avgRating.toFixed(1)} / 5 • {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
              {withMedia > 0 && <span className="font-mono text-xs text-muted-foreground">• {withMedia} with media</span>}
            </div>
          )}
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-sm">
            Write a Review
          </Button>
        )}
      </div>

      {/* Review form */}
      {showForm && <ReviewForm productId={productId} orderId={verifiedOrderId} onClose={() => setShowForm(false)} />}

      {/* Sort */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Sort:</span>
          {SORT_OPTIONS.map(o => (
            <button key={o.value} onClick={() => setSort(o.value)}
              className={`font-mono text-xs px-3 py-1 border transition-colors ${sort === o.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <div className="space-y-3">
          <p className="font-mono text-xs text-primary uppercase tracking-wider">Featured Reviews</p>
          {featured.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}

      {/* All reviews */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 border border-border border-dashed">
          <Star className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-mono text-xs text-muted-foreground uppercase">No reviews yet — be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(r => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}