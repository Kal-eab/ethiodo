import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { maskName } from '@/lib/maskName';

export function StarRating({ value, onChange, size = 'md' }) {
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
  const [lightbox, setLightbox] = useState(null);
  const displayName = maskName(review.reviewer_name);
  return (
    <div className="bg-card border border-border p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{displayName}</p>
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
            <button key={i} type="button" onClick={() => setLightbox(url)} className="h-20 w-20 border border-border overflow-hidden">
              <img src={url} alt={`review-photo-${i}`} className="h-full w-full object-cover hover:opacity-80 transition-opacity" />
            </button>
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

      {lightbox && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'media', label: 'With Photos/Videos' },
];

export default function ReviewSection({ productId }) {
  const [sort, setSort] = useState('latest');

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
      <div>
        <h2 className="text-xl font-bold">Customer Reviews {reviews.length > 0 && `(${reviews.length})`}</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <StarRating value={Math.round(avgRating)} />
            <span className="font-mono text-sm text-muted-foreground">{avgRating.toFixed(1)} / 5 • {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
            {withMedia > 0 && <span className="font-mono text-xs text-muted-foreground">• {withMedia} with media</span>}
          </div>
        )}
      </div>

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
