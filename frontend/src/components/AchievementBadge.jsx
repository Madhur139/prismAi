/*
  ACHIEVEMENT BADGE
  - Small badge chip used on profile, settings and lesson pages.
*/
import React from 'react';
import { Icon } from '../components/Icon.jsx';
import { badgeOf } from '../utils/achievements.js';


export function AchievementBadge({ id, small = false }) {
  const b = badgeOf(id);
  if (!b) return null;
  return (
    <span
      className={`badge ${b.tone} ${small ? 'badge-sm' : ''}`}
      title={`${b.title}: ${b.desc}`}
    >
      <Icon name={b.icon} size={small ? 12 : 16} />
      <span>{b.title}</span>
    </span>
  );
}
