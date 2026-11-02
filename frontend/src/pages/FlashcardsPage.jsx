/*
  FLASHCARD STUDY MODE
  - Turns any lesson into front/back cards for spaced-repetition style review.
  - Also includes flashcards you create yourself.
  - Route: #/app/flashcards
*/
import React, { useState, useCallback, useEffect } from 'react';
import { lessonCards, cardsToTSV, downloadText } from '../utils/exportFlashcards.js';
import { Icon } from '../components/Icon.jsx';
import { Panel, Empty, Toggle } from '../components/ui.jsx';
import { ART } from '../utils/coverImage.js';
import { checkBadges, badgeOf } from '../utils/achievements.js';
import { incrementStat, readStats } from '../utils/stats.js';
import { readManualFlashcards, addManualFlashcard, deleteManualFlashcard } from '../utils/manualFlashcards.js';
import { ManualFlashcardCreator } from '../components/ManualFlashcardCreator.jsx';
import { go } from '../utils/router.js';

export function Flashcards({ lessons, notify }) {
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffleCards, setShuffleCards] = useState(false);
  const [reviewed, setReviewed] = useState(new Set());
  const [manualCards, setManualCards] = useState([]);
  const [showCreator, setShowCreator] = useState(false);

  const buildDeck = useCallback(() => {
    let cards = [];
    (lessons || []).forEach(l => cards.push(...lessonCards(l)));
    // Add user-created manual flashcards
    manualCards.forEach(c => cards.push({ front: c.front, back: c.back, type: 'MANUAL', id: c.id }));
    if (shuffleCards) cards = cards.sort(() => Math.random() - 0.5);
    setDeck(cards);
    setIndex(0);
    setFlipped(false);
    setReviewed(new Set());
  }, [lessons, manualCards, shuffleCards]);

  useEffect(() => { buildDeck(); }, [buildDeck]);
  useEffect(() => { setManualCards(readManualFlashcards()); }, []);

  const card = deck[index];
  const totalReviewed = reviewed.size;

  const nextCard = () => {
    if (!flipped) return;
    const next = index + 1;
    if (next >= deck.length) {
      setIndex(0);
      setFlipped(false);
      setReviewed(new Set());
      notify?.('Deck complete — great job!', 'success');
      incrementStat('flashcards', 1);
      const won = checkBadges(readStats());
      if (won.length && notify) notify(`New badge${won.length > 1 ? 's' : ''}: ${won.map(w => badgeOf(w).title).join(', ')}`, 'success');
      return;
    }
    setIndex(next);
    setFlipped(false);
    setReviewed(prev => { const nxt = new Set(prev); nxt.add(index); return nxt; });
    incrementStat('flashcards', 1);
    const won = checkBadges(readStats());
    if (won.length && notify) notify(`New badge${won.length > 1 ? 's' : ''}: ${won.map(w => badgeOf(w).title).join(', ')}`, 'success');
  };

  const handleManualAdded = (card) => {
    setManualCards(prev => [...prev, card]);
    setShowCreator(false);
    notify?.('Flashcard created!', 'success');
  };

  const handleDeleteManual = (id) => {
    deleteManualFlashcard(id);
    setManualCards(prev => prev.filter(c => c.id !== id));
    notify?.('Flashcard deleted.', 'success');
  };

  // Always render the creator modal so it can open even when the deck is empty.
  const creatorModal = showCreator && (
    <ManualFlashcardCreator onClose={() => setShowCreator(false)} onAdded={handleManualAdded} />
  );

  if (!deck.length) {
    const hasLessons = (lessons || []).length > 0;
    const hasManual = manualCards.length > 0;
    return (
      <div className="page narrow flashcards">
        {creatorModal}
        <Empty
          icon={hasManual ? 'cards' : hasLessons ? 'alert' : 'cards'}
          title={hasManual ? 'Your flashcards' : hasLessons ? 'No flashcards could be made' : 'No flashcards yet'}
          text={
            hasManual
              ? 'You have created flashcards. Click below to add more or start reviewing.'
              : hasLessons
                ? 'Your lessons have games, but none have both a question and answer.'
                : 'Create a lesson with games first, then come back here to review them as cards.'
          }
          action={
            <>
              <button className="btn primary" onClick={() => setShowCreator(true)}>
                <Icon name="plus" size={17} /> Create Flashcard
              </button>
              {hasLessons && <button className="btn ghost" onClick={() => go('/app/create')}>
                <Icon name="book" size={17} /> Create Lesson
              </button>}
            </>
          }
          art={!hasManual ? '/images/empty/flashcards.svg' : undefined}
        />
        {hasLessons && !hasManual && (
          <p className="muted pad">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} found, but 0 flashcards.
          </p>
        )}
      </div>
    );
  }

  if (!card) {
    return (
      <div className="page narrow flashcards">
        <Empty icon="alert" title="No cards to show" text="Something went wrong loading the deck. Try going back and returning." />
      </div>
    );
  }

  const isManual = card.type === 'MANUAL';

  return (
    <div className="page narrow flashcards">
      <div className="page-intro">
        <div>
          <h2>Flashcards</h2>
          <p>{deck.length} card{deck.length !== 1 ? 's' : ''} across your lessons.</p>
        </div>
        <div className="deck-progress">{index + 1} / {deck.length}</div>
      </div>

      <Panel title="Review" subtitle={isManual ? 'Your flashcard' : (card.type || '')}>
        <div className="card-stack">
          <div
            className={`flashcard ${flipped ? 'flipped' : ''} ${isManual ? 'manual' : ''}`}
            onClick={() => setFlipped(!flipped)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setFlipped(!flipped)}
          >
            <div className="card-face card-front">
              <div className="card-label">Question</div>
              <div className="card-text">{card.front}</div>
              {isManual && <button className="delete-manual" onClick={e => { e.stopPropagation(); handleDeleteManual(card.id); }}><Icon name="trash" size={14} /></button>}
            </div>
            <div className="card-face card-back">
              <div className="card-label">Answer</div>
              <div className="card-text">{card.back}</div>
              {isManual && <button className="delete-manual" onClick={e => { e.stopPropagation(); handleDeleteManual(card.id); }}><Icon name="trash" size={14} /></button>}
            </div>
          </div>
        </div>
        <div className="card-actions">
          <button className="btn ghost" onClick={() => setFlipped(!flipped)}>
            {flipped ? 'Show question' : 'Reveal answer'}
          </button>
          <button className="btn primary" onClick={nextCard} disabled={!flipped}>
            <Icon name="chevron-right" size={16} /> Next
          </button>
          <Toggle on={shuffleCards} onClick={() => setShuffleCards(!shuffleCards)} label="Shuffle cards" />
        </div>
        <div className="deck-actions">
          <button className="btn ghost" onClick={() => setShowCreator(true)}>
            <Icon name="plus" size={16} /> Add Flashcard
          </button>
          <button className="btn ghost" onClick={() => {
            const name = (lessons?.[0]?.topic || 'deck').replace(/[^\w\d-]+/g, '-').toLowerCase();
            downloadText(`${name}-flashcards.txt`, cardsToTSV(deck));
            notify?.('Deck downloaded.', 'success');
          }}>
            <Icon name="download" size={16} /> Download deck
          </button>
          {totalReviewed > 0 && (
            <span className="deck-stat"><Icon name="check" size={14} /> {totalReviewed} reviewed</span>
          )}
        </div>
      </Panel>

      {showCreator && (
        <ManualFlashcardCreator onClose={() => setShowCreator(false)} onAdded={handleManualAdded} />
      )}
    </div>
  );
}
