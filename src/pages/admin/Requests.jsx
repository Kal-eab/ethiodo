import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Check, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminRequests() {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['contact-requests'],
    queryFn: () => base44.entities.ContactRequest.list('-created_date', 100),
  });

  const markHandled = async (id) => {
    await base44.entities.ContactRequest.delete(id);
    queryClient.invalidateQueries({ queryKey: ['contact-requests'] });
    toast.success('Request deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Customer Requests</h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">
          {requests.filter(r => r.status === 'new').length} new, {requests.length} total
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="font-mono text-muted-foreground text-sm">NO REQUESTS YET</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div
              key={req.id}
              className={`bg-card border p-6 transition-colors ${
                req.status === 'new' ? 'border-primary/30' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{req.name}</h3>
                    <span className={`font-mono text-[10px] uppercase px-2 py-0.5 ${
                      req.status === 'new' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {req.email} • {req.created_date ? format(new Date(req.created_date), 'MMM d, yyyy HH:mm') : '—'}
                  </p>
                </div>
                {req.status === 'new' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markHandled(req.id)}
                    className="font-mono text-xs border-border shrink-0"
                  >
                    <Check className="w-3 h-3 mr-1" /> HANDLED
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{req.message}</p>
              {req.image_url && (
                <div className="mt-4">
                  <p className="font-mono text-xs text-muted-foreground uppercase mb-2 flex items-center gap-1">
                    <Image className="w-3 h-3" /> Attachment
                  </p>
                  <a href={req.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={req.image_url} alt="Attachment" className="max-h-48 border border-border hover:opacity-80 transition-opacity" />
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}