/*
  MANUAL FLASHCARDS
  - Lets users create their own flashcards when their lessons don't have
    suitable games.
  - Stored in localStorage (prism_manual_flashcards).
*/
const KEY = 'prism_manual_flashcards';

export function readManualFlashcards() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveManualFlashcards(cards) {
  try { localStorage.setItem(KEY, JSON.stringify(cards)); } catch {}
}

export function addManualFlashcard(card) {
  const cards = readManualFlashcards();
  const newCard = {
    id: Date.now().toString(),
    front: String(card.front || '').trim(),
    back: String(card.back || '').trim(),
    createdAt: new Date().toISOString(),
  };
  if (!newCard.front || !newCard.back) return null;
  cards.unshift(newCard);
  saveManualFlashcards(cards);
  return newCard;
}

export function deleteManualFlashcard(id) {
  const cards = readManualFlashcards().filter(c => c.id !== id);
  saveManualFlashcards(cards);
}

export function clearManualFlashcards() {
  try { localStorage.removeItem(KEY); } catch {}
}
