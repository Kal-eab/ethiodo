import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

/**
 * MobileHeader — fixed top bar shown only on mobile (md:hidden).
 * Replaces inline back-links on child screens.
 *
 * Props:
 *   title    — string displayed in the center
 *   onBack   — optional custom back handler; defaults to navigate(-1)
 *   right    — optional JSX rendered on the right side
 */
export default function MobileHeader({ title, onBack, right }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center h-14 px-2 bg-background/95 backdrop-blur-xl border-b border-border"
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        className="flex items-center justify-center w-10 h-10 rounded-full text-foreground hover:bg-secondary transition-colors flex-shrink-0"
        aria-label="Go back"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Title */}
      <span className="flex-1 text-center font-semibold text-sm truncate px-2">
        {title}
      </span>

      {/* Right slot — keeps title visually centered */}
      <div className="w-10 flex-shrink-0 flex items-center justify-end">
        {right || null}
      </div>
    </header>
  );
}