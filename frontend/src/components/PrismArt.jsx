/* Decorative animated prism: a white beam goes in, a spectrum fans out. Pure SVG + CSS. */
import React from 'react';

const COLORS = ['#ff5d8f', '#ff9f43', '#ffd84d', '#37e0a0', '#2cb8ff', '#8b7bff'];

export function PrismArt({ className = '' }) {
  return (
    <svg className={'prism-art ' + className} viewBox="0 0 520 420" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pa-face" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".55" /><stop offset="1" stopColor="#a79bff" stopOpacity=".18" /></linearGradient>
        <linearGradient id="pa-in" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".95" /></linearGradient>
      </defs>
      <path className="pa-in" d="M0 210 L214 192 L214 228Z" fill="url(#pa-in)" />
      {COLORS.map((c, i) => (
        <path key={c} className="pa-beam" style={{ animationDelay: `${i * 0.35}s` }} d={`M318 ${186 + i * 4} L540 ${96 + i * 46} L540 ${118 + i * 46} L318 ${190 + i * 4}Z`} fill={c} />
      ))}
      <path d="M262 66 L384 296 L140 296 Z" fill="url(#pa-face)" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M262 66 L384 296 L262 296Z" fill="#fff" fillOpacity=".08" />
      <path d="M262 66 L262 296" stroke="rgba(255,255,255,.3)" strokeWidth="1.5" />
    </svg>
  );
}
