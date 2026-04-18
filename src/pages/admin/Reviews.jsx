import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, X, Star, CheckCircle, Trash2, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= value ? 'fill-primary text-primary' : 'text-border'}`} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [filter, setFilter] = useState('pending');
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => filter === 'all'
      ? base44.entities.Review.list('-created_date', 200)
      : base44.entities.Review.filter({ status: filter }, '-created_date', 200),
  });

  const update = async (id, data, msg) => {
    await base44.entities.Review.update(id, data);
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    toast.success(msg);
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await base44.entities.Review.delete(id);
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    toast.success('Review deleted');
  };

  const statusColors = { pending: 'text-yellow-400', approved: 'text-accent', rejected: 'text-destructive' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="font-mono text-xs text-muted-foreground mt-1">{reviews.length} {filter}</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border">
          <p className="font-mono text-xs text-muted-foreground uppercase">No {filter} reviews</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-card border border-border p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-secondary border border-border flex items-center justify-center text-sm font-bold">
                    {(review.reviewer_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{review.reviewer_name || 'Anonymous'}</p>
                      {review.verified_buyer && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-accent border border-accent/30 px-1.5 py-0.5">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      )}
                      <span className={`font-mono text-[10px] uppercase ${statusColors[review.status]}`}>{review.status}</span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground">
                      {review.reviewer_email} • {review.created_date ? format(new Date(review.created_date), 'MMM d, yyyy HH:mm') : ''}
                    </p>
                  </div>
                </div>
                <StarDisplay value={review.rating} />
              </div>

              {review.title && <p className="font-semibold text-sm">{review.title}</p>}
              <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>

              {review.photos?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="h-16 w-16 object-cover border border-border" />
                  ))}
                </div>
              )}
              {review.videos?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {review.videos.map((url, i) => (
                    <video key={i} src={url} controls className="h-20 w-auto border border-border" />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                {review.status !== 'approved' && (
                  <Button size="sm" onClick={() => update(review.id, { status: 'approved' }, 'Review approved')}
                    className="bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 font-mono text-xs h-8">
                    <Check className="w-3.5 h-3.5 mr-1" /> Approve
                  </Button>
                )}
                {review.status !== 'rejected' && (
                  <Button size="sm" onClick={() => update(review.id, { status: 'rejected' }, 'Review rejected')}
                    variant="outline" className="font-mono text-xs h-8 border-border text-muted-foreground">
                    <X className="w-3.5 h-3.5 mr-1" /> Reject
                  </Button>
                )}
                <Button size="sm" onClick={() => update(review.id, { featured: !review.featured }, review.featured ? 'Unfeatured' : 'Featured!')}
                  variant="outline" className={`font-mono text-xs h-8 ${review.featured ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
                  <Pin className="w-3.5 h-3.5 mr-1" /> {review.featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteReview(review.id)}
                  className="text-muted-foreground hover:text-destructive font-mono text-xs h-8 ml-auto">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}