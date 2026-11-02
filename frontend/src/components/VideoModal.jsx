/*
  VIDEO MODAL
  - Plays a YouTube video in a lightbox over the page.
  - Uses the privacy-friendly youtube-nocookie embed, same as the inline player.
  - Escape closes it and the page scroll is restored on unmount.
*/
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon.jsx';

export function VideoModal({ videoId, title, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Stop the page behind the lightbox from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [onClose]);

  // Portalled to <body> so the lightbox is always centred in the viewport.
  return createPortal(
    <div className="modal-backdrop video-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="video-modal" role="dialog" aria-modal="true" aria-label={title || 'Video player'}>
        <button className="icon-btn video-modal-x" onClick={onClose} aria-label="Close video"><Icon name="x" size={20} /></button>
        <div className="video-frame-lg">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title || 'Lesson video'}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
        {title && <h3 className="video-modal-title">{title}</h3>}
      </div>
    </div>,
    document.body
  );
}
