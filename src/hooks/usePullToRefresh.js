import { useState, useEffect, useRef } from 'react';

const THRESHOLD = 70;

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0); // 0–1
  const startYRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current || window;

    const onTouchStart = (e) => {
      const scrollTop = containerRef.current
        ? containerRef.current.scrollTop
        : window.scrollY;
      if (scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        setProgress(Math.min(dy / THRESHOLD, 1));
        setPulling(true);
      }
    };

    const onTouchEnd = async () => {
      if (progress >= 1) {
        await onRefresh();
      }
      setPulling(false);
      setProgress(0);
      startYRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onRefresh, progress]);

  return { pulling, progress, containerRef };
}