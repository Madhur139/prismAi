/*
  MANUAL FLASHCARD CREATOR
  - A modal form to write your own flashcard question + answer.
  - Saved to localStorage and mixed into the flashcard deck.
*/
import React, { useState } from 'react';
import { Icon } from '../components/Icon.jsx';
import { Modal } from '../components/ui.jsx';
import { addManualFlashcard } from '../utils/manualFlashcards.js';

export function ManualFlashcardCreator({ onClose, onAdded }) {
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    if (!front.trim()) return setErr('Please write a question.');
    if (!back.trim()) return setErr('Please write an answer.');
    setBusy(true);
    try {
      const card = addManualFlashcard({ front: front.trim(), back: back.trim() });
      if (card && onAdded) onAdded(card);
      setFront(''); setBack('');
      onClose?.();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <Modal eyebrow="CREATE FLASHCARD" title="Write your own flashcard" onClose={onClose}>
      <div className="custom-editor">
        <div className="custom-row">
          <label>Question</label>
          <textarea
            value={front} onChange={e => setFront(e.target.value)}
            rows={3} placeholder="What is the question?"
            className="custom-input"
          />
        </div>
        <div className="custom-row">
          <label>Answer</label>
          <textarea
            value={back} onChange={e => setBack(e.target.value)}
            rows={3} placeholder="What is the answer?"
            className="custom-input"
          />
        </div>
        {err && <div className="field-err">{err}</div>}
        <div className="custom-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={busy}>
            {busy ? <><Icon name="loader" size={14} className="ide-spin" /> Saving…</> : <><Icon name="plus" size={14} /> Create Flashcard</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
