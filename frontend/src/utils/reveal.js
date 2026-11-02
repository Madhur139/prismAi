/*
  SCROLL REVEAL
  - Elements marked with `data-reveal` fade + rise in the first time they scroll into view.
  - Purely decorative: without IntersectionObserver (or with reduced motion) everything
    is simply shown, so content is never hidden.
*/
import { useEffect } from 'react';

export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('[data-reveal]:not(.is-visible)'));
    if (!els.length) return;

    // Fallback: reveal everything immediately.
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target); // reveal once, then stop watching
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  });
}
