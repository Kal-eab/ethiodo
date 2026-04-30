import React from 'react';
import { Heart } from 'lucide-react';

export default function ComingSoonProductCard({ product, isFavorite, onToggleFavorite, onNavigate }) {
  return (
    <div className="block group cursor-pointer" onClick={() => onNavigate(`/product/${product.id}`)}>
      <div className="bg-card border border-border/60 rounded-xl overflow-hidden transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(180,255,0,0.06)] group-hover:-translate-y-1">
        <div className="relative aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden">
          {product.images?.[0]
            ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            : <div className="w-full h-full bg-secondary" />
          }
          <div className="absolute inset-0 flex flex-col items-end justify-start p-2 gap-1">
            <span className="font-mono text-[10px] font-bold text-primary uppercase tracking-widest bg-black/70 px-2 py-0.5 rounded">Coming Soon</span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, product); }}
              className="w-7 h-7 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-full border border-border/40 transition-colors hover:bg-background/90"
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-primary text-primary' : 'text-white'}`} />
            </button>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="block w-full bg-secondary text-foreground font-mono text-[10px] h-8 border border-primary rounded-lg flex items-center justify-center gap-1">
                COMING SOON
              </div>
            </div>
          </div>
        </div>
        <div className="p-2.5 space-y-1">
          <h3 className="font-medium text-xs truncate leading-tight text-muted-foreground">{product.name}</h3>
          <span className="font-mono text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">Coming Soon</span>
        </div>
      </div>
    </div>
  );
}