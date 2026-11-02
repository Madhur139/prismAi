/* HOTSPOT GAME - click the right region of a diagram. */
import React, { useState } from 'react';

/* A diagram we drew ourselves is stored as SVG and shown inline. */
export const diagramSrc = (game, imageUrl) =>
  game?.svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(game.svg)}` : imageUrl || '';

export function Hotspot({ game, imageUrl, onAnswer, submitted }) {
  const [pt, setPt] = useState(null), h = game.hotspot;
  const src = diagramSrc(game, imageUrl);
  const click = e => {
    if (submitted || !h) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    setPt({ x, y });
    onAnswer(x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h ? game.answer : '__miss__');
  };
  return (
    <div className="hotspot-game">
      <div className="hotspot-image" onClick={click} style={{ cursor: submitted ? 'default' : 'crosshair' }}>
        <img src={src} alt="Lesson diagram" draggable="false" />
        {pt && <span className="hs-pin" style={{ left: `${pt.x}%`, top: `${pt.y}%` }} />}
        {submitted && h && <div className="hotspot-target" style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }} />}
      </div>
      <p className="hint-line">{submitted ? `Target area: ${h?.label || game.answer}` : 'Click the part of the diagram that answers the question.'}</p>
    </div>
  );
}
