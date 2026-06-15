import React, { useState } from 'react';
import { X, Copy, Check, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PLATFORMS = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#25D366',
    icon: '💬',
    getUrl: (url, name) => `https://wa.me/?text=${encodeURIComponent(name + '\n' + url)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    color: '#229ED9',
    icon: '✈️',
    getUrl: (url, name) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(name)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    icon: '👥',
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    color: '#000000',
    icon: '𝕏',
    getUrl: (url, name) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(name)}&url=${encodeURIComponent(url)}`,
  },
];

export default function ShareModal({ product, onClose, userId, userEmail }) {
  const [copied, setCopied] = useState(false);
  const [sharedPlatforms, setSharedPlatforms] = useState(new Set());

  // Build referral URL — includes ref= param if user is logged in
  const baseUrl = `${window.location.origin}/product/${product.id}`;
  const shareUrl = userId ? `${baseUrl}?ref=${userId.slice(0, 8)}` : baseUrl;

  const trackShare = async (platform) => {
    try {
      await base44.entities.ProductShare.create({
        product_id: product.id,
        user_id: userId || null,
        platform,
        referral_code: userId ? userId.slice(0, 8) : null,
      });
      setSharedPlatforms(prev => new Set([...prev, platform]));
    } catch (_) {}
  };

  const handlePlatformShare = (p) => {
    window.open(p.getUrl(shareUrl, product.name), '_blank', 'noopener,noreferrer');
    trackShare(p.key);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    trackShare('copy');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-sm bg-card border border-border rounded-t-2xl sm:rounded-2xl p-5 pb-8 sm:pb-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-sm">Share Product</p>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{product.name}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Platform buttons */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {PLATFORMS.map(p => (
            <button
              key={p.key}
              onClick={() => handlePlatformShare(p)}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all hover:bg-secondary"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                style={{ background: p.color + '22', border: `1px solid ${p.color}44` }}
              >
                {sharedPlatforms.has(p.key) ? '✓' : p.icon}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Copy link */}
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
          <span className="flex-1 text-xs text-muted-foreground truncate font-mono">{shareUrl}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
            style={copied
              ? { background: 'rgba(72,255,72,0.12)', color: 'hsl(157,100%,50%)', border: '1px solid rgba(72,255,72,0.3)' }
              : { background: 'rgba(180,255,0,0.1)', color: 'hsl(72,100%,50%)', border: '1px solid rgba(180,255,0,0.3)' }
            }
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}