/* BOSS BAR - boss health + your hearts during boss mode. */
import React from 'react';
import { Icon } from './Icon.jsx';

export function BossBar({ total, hits, lives }) {
  const hp = Math.max(0, 100 - (hits / total) * 100);
  return (
    <div className="boss-bar">
      <div className="boss-face" key={hits}><Icon name="skull" size={26} /></div>
      <div className="boss-hp"><span>BOSS · {Math.round(hp)}% HP</span><div><i style={{ width: hp + '%' }} /></div></div>
      <div className="hearts" aria-label={`${lives} lives left`}>{[0, 1, 2].map(i => <Icon key={i} name="heart" size={22} fill={i < lives ? 'currentColor' : 'none'} className={i < lives ? 'on' : 'off'} />)}</div>
    </div>
  );
}
