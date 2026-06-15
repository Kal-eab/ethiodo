import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function LikeButton({ product, className = '' }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeId, setLikeId] = useState(null);
  const [count, setCount] = useState(product?.totalLikes || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !product?.id) return;
    base44.entities.ProductLike.filter({ product_id: product.id, user_id: user.id })
      .then(res => {
        if (res.length > 0) {
          setLiked(true);
          setLikeId(res[0].id);
        }
      })
      .catch(() => {});
  }, [user, product?.id]);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
    if (loading) return;
    setLoading(true);
    try {
      if (liked) {
        await base44.entities.ProductLike.delete(likeId);
        setLiked(false);
        setLikeId(null);
        setCount(c => Math.max(0, c - 1));
      } else {
        const created = await base44.entities.ProductLike.create({
          product_id: product.id,
          user_id: user.id,
          user_email: user.email,
        });
        setLiked(true);
        setLikeId(created.id);
        setCount(c => c + 1);
      }
    } catch (_) {}
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1 transition-all ${className}`}
      title={liked ? 'Unlike' : 'Like'}
    >
      <Heart
        className="w-4 h-4 transition-all"
        style={liked
          ? { fill: 'hsl(0,85%,60%)', stroke: 'hsl(0,85%,60%)' }
          : { fill: 'transparent', stroke: 'currentColor' }
        }
      />
      {count > 0 && <span className="text-xs font-mono">{count}</span>}
    </button>
  );
}