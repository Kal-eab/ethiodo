import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefreshIndicator({ progress, pulling }) {
  if (!pulling && progress === 0) return null;

  const size = Math.round(progress * 100);
  const ready = progress >= 1;

  return (
    <div
      className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${Math.round(progress * 48)}px)`, transition: pulling ? 'none' : 'transform 0.3s ease' }}
    >
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono shadow-lg"
        style={{
          background: ready ? 'hsl(72,100%,50%)' : 'hsl(var(--card))',
          color: ready ? '#0a0a0a' : 'hsl(var(--muted-foreground))',
          border: '1px solid hsl(var(--border))',
          opacity: progress,
        }}
      >
        <RefreshCw
          className="w-3.5 h-3.5"
          style={{ transform: `rotate(${progress * 360}deg)`, transition: 'transform 0.1s linear' }}
        />
        {ready ? 'Release to refresh' : 'Pull to refresh'}
      </div>
    </div>
  );
}