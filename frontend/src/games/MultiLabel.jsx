/*
  MULTI LABEL - click EVERY part of the diagram that matches the question.
  Same idea as DIAGRAM_HOTSPOT, but with several correct boxes.
  The x/y/w/h values are PERCENTAGES of the image, exactly like Hotspot.jsx.
*/
import React, { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { diagramSrc } from './Hotspot.jsx';
import '../styles/games/visual.css';

export function MultiLabel({ game, imageUrl, submitted, onAnswer }) {
  const spots = game.hotspots || [];
  const [picked, setPicked] = useState([]); // indexes of the chosen boxes
  const src = diagramSrc(game, imageUrl);

  const click = e => {
    if (submitted || !spots.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
    const hit = spots.findIndex(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hit < 0) return;
    const next = picked.includes(hit) ? picked.filter(i => i !== hit) : [...picked, hit];
    setPicked(next);
    // The labels are sorted the same way the server sorts them, so the set
    // can be compared no matter which order the learner clicked them in.
    onAnswer(next.map(i => spots[i].label).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).join('|'));
  };

  if (!spots.length) return <div className="mlbl-empty"><p>This game could not be built from its data.</p></div>;

  return (
    <div className="mlbl-game">
      <div className="hotspot-image" onClick={click} style={{ cursor: submitted ? 'default' : 'crosshair' }}>
        {src && <img src={src} alt="Lesson diagram" draggable="false" />}
        {picked.map(i => (
          <span key={i} className="hs-pin" style={{ left: `${spots[i].x + spots[i].w / 2}%`, top: `${spots[i].y + spots[i].h / 2}%` }} />
        ))}
        {submitted && spots.map((h, i) => (
          <div
            key={i}
            className={`hotspot-target ${picked.includes(i) ? 'right' : 'miss'}`}
            style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.w}%`, height: `${h.h}%` }}
          />
        ))}
      </div>
      <div className="mlbl-chips">
        {spots.map((h, i) => (
          <span key={i} className={`mlbl-chip ${picked.includes(i) ? 'on' : ''}`}>
            {picked.includes(i) && <Icon name="check" size={13} stroke={3} />} {h.label}
          </span>
        ))}
      </div>
      <p className="hint-line">{submitted ? 'These were the parts to find.' : 'Click every part of the diagram that answers the question.'}</p>
    </div>
  );
}
