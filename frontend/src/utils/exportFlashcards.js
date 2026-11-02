/*
  FLASHCARD EXPORT
  Turns a lesson into a tab-separated deck that Anki or Quizlet can import.
  Anki: File > Import > "Text" with "Tab" separator.
  Quizlet: Import > "TSV" (tab separated).
*/
import { GAME_META } from '../constants/games.js';

/* The back side of one game, in a form that makes sense to read. */
function backOf(g) {
  switch (g.type) {
    case 'MATCH_PAIRS':
    case 'MEMORY_MATCH':
      return (g.pairs || []).map(p => `${p.left} → ${p.right}`).join('; ');
    case 'ORDERING':
      return (g.steps || []).join(' → ');
    case 'TIMELINE':
      return (g.steps || []).map((s, i) => `${(g.dates || [])[i] || ''} — ${s}`).join(' → ');
    case 'ANAGRAM':
    case 'WORD_SNAKE':
      return (g.targetWords || []).join(' ');
    case 'SENTENCE_UNSCRAMBLE':
      return (g.words || []).join(' ');
    case 'MULTI_LABEL':
      return (g.hotspots || []).map(h => h.label).join(', ');
    case 'CODE_OUTPUT':
      return `${g.answer}\n\n${g.code || ''}`;
    default:
      return g.answer || '';
  }
}

/* The front side of one game. */
function frontOf(g) {
  if (g.type === 'CODE_OUTPUT') return `${g.prompt}\n\n${g.code || ''}`;
  return g.prompt || '';
}

/**
 * Build the deck for a lesson.
 * Returns an array of { front, back, type } cards.
 */
export function lessonCards(lesson) {
  const cards = [];
  (lesson?.concepts || []).forEach(c => {
    (c.microGames || []).forEach(g => {
      const front = frontOf(g);
      const back = backOf(g);
      if (!front || !back) return;
      // Extra meaning comes from the explanation, so nothing is lost in the export.
      cards.push({ front: front.replace(/\s+/g, ' ').trim(), back: (g.explanation ? back + '\n\n' + g.explanation : back).trim(), type: g.type });
    });
  });
  return cards;
}

/** The deck as tab-separated text (what Anki and Quizlet expect). */
export function cardsToTSV(cards) {
  const clean = s => String(s ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' | ').trim();
  return cards.map(c => `${clean(c.front)}\t${clean(c.back)}`).join('\n');
}

/** Download a string as a file in the browser. */
export function downloadText(filename, text, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download the lesson as a flashcard deck. */
export function exportLesson(lesson) {
  const cards = lessonCards(lesson);
  if (!cards.length) return 0;
  const name = (lesson?.topic || 'lesson').replace(/[^\w\d-]+/g, '-').toLowerCase().slice(0, 40);
  downloadText(`${name}-flashcards.txt`, cardsToTSV(cards));
  return cards.length;
}

export { GAME_META };
