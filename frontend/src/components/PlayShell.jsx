/* PLAY SHELL - the full-screen frame (top bar + progress) shared by every game page. */
import React from 'react';
import { Icon } from './Icon.jsx';
import { IconButton, Spinner } from './ui.jsx';

export function PlayShell({ color = '#7c6cff', kicker = 'PRISM', title, progress = 0, onExit, right, children, toast }) {
  return (
    <div className="play" style={{ '--gc': color }}>
      <div className="play-bg" aria-hidden="true" />
      <header className="play-top">
        <IconButton icon="x" label="Exit game" onClick={onExit} className="lg" size={22} />
        <div className="play-meta"><span>{kicker}</span><b>{title}</b></div>
        <div className="play-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: Math.round(progress * 100) + '%' }} /></div>
        <div className="play-right">{right}</div>
      </header>
      <main className="play-main">{children}</main>
      {toast}
    </div>
  );
}
export function Notice({ title, text, action, busy }) {
  return <div className="play-notice">{busy ? <Spinner /> : <div className="empty-ico"><Icon name="alert" size={26} /></div>}<h2>{title}</h2>{text && <p>{text}</p>}{action}</div>;
}
