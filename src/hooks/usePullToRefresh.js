import { useState, useEffect, useRef, useCallback } from 'react';

const THRESHOLD = 70;

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const startYRef = useRef(null);
  const progressRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);

  // Keep ref in sync so the effect doesn't need onRefresh as a dependency
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY <= 0) {
        startYRef.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startYRef.current === null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        const p = Math.min(dy / THRESHOLD, 1);
        progressRef.current = p;
        setProgress(p);
        setPulling(true);
      }
    };

    const onTouchEnd = async () => {
      if (startYRef.current === null) return;
      if (progressRef.current >= 1) {
        await onRefreshRef.current();
      }
      setPulling(false);
      setProgress(0);
      progressRef.current = 0;
      startYRef.current = null;
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []); // Empty deps — no re-registration on every render

  return { pulling, progress };
}