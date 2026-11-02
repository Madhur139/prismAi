/*
  COVER IMAGES
  - Maps a lesson topic to a matching local photo in /public/images/covers.
  - Rules are checked top to bottom, so the most specific keywords come first.
  - Nothing is fetched from the internet at runtime: every file ships with the app.
*/

/* [image key, keywords that should match it] */
const COVER_RULES = [
  ['space', ['space', 'astronomy', 'planet', 'planets', 'solar', 'galaxy', 'orbit', 'nasa', 'universe', 'moon', 'mars', 'comet', 'telescope']],
  ['biology', ['biology', 'cell', 'anatomy', 'organ', 'organs', 'dna', 'genetic', 'photosynthesis', 'ecology', 'evolution', 'organism', 'protein', 'botany', 'zoology', 'human body', 'digestive', 'digestion', 'stomach', 'intestine', 'nutrient', 'neuron', 'enzyme', 'enzymes', 'mitochondria', 'chloroplast', 'respiration', 'biodiversity']],
  ['chemistry', ['chemistry', 'chemical', 'molecule', 'reaction', 'acid', 'compound', 'periodic', 'titration']],
  ['physics', ['physics', 'force', 'energy', 'motion', 'gravity', 'electric', 'electricity', 'magnet', 'quantum', 'relativity', 'newton', 'velocity', 'momentum', 'optic', 'circuit', 'circuits', 'voltage', 'wave', 'waves']],
  ['science', ['science', 'experiment', 'laboratory', 'scientific', 'research', 'hypothesis', 'methodology']],
  ['math', ['math', 'maths', 'mathematics', 'algebra', 'geometry', 'calculus', 'fraction', 'fractions', 'trigonometry', 'equation', 'equations', 'arithmetic', 'percent', 'theorem', 'probability', 'statistics', 'vector', 'vectors', 'matrix', 'logarithm', 'prime']],
  ['programming', ['javascript', 'typescript', 'python', 'java', 'react', 'html', 'css', 'code', 'coding', 'program', 'programming', 'array', 'arrays', 'function', 'functions', 'algorithm', 'sql', 'database', 'linux', 'git', 'api', 'frontend', 'backend', 'closure', 'closures', 'variable', 'variables', 'loop', 'loops', 'iteration']],
  ['economics', ['economics', 'economy', 'economic', 'stock', 'market', 'markets', 'finance', 'trade', 'business', 'inflation', 'invest', 'investment', 'supply', 'demand', 'gdp']],
  ['history', ['history', 'historical', 'empire', 'war', 'revolution', 'ancient', 'civilization', 'civilisation', 'medieval', 'century', 'renaissance', 'dynasty', 'treaty', 'president', 'bastille', 'monarchy', 'kingdom']],
  ['geography', ['geography', 'continent', 'continents', 'country', 'countries', 'climate', 'ocean', 'oceans', 'mountain', 'mountains', 'river', 'rivers', 'population', 'weather', 'tectonic', 'ecosystem', 'latitude', 'longitude']],
  ['language', ['language', 'languages', 'french', 'spanish', 'german', 'italian', 'vocabulary', 'grammar', 'sentence', 'sentences', 'verb', 'verbs', 'noun', 'nouns', 'pronoun', 'adjective', 'translate', 'translation', 'literature', 'poetry', 'novel', 'shakespeare', 'essay', 'essays', 'linguistics']],
  ['art', ['art', 'arts', 'painting', 'paint', 'draw', 'drawing', 'design', 'color', 'colour', 'sketch', 'illustration', 'sculpture', 'photography', 'architecture']],
  ['music', ['music', 'song', 'songs', 'piano', 'guitar', 'melody', 'rhythm', 'compose', 'composer', 'symphony', 'chord', 'classical', 'hip hop', 'scale', 'octave']],
  ['technology', ['network', 'networks', 'server', 'servers', 'cyber', 'security', 'computer', 'computers', 'hardware', 'engineering', 'engineer', 'robot', 'robots', 'machine learning', 'internet', 'cloud', 'device', 'devices', 'software']],
];

/* Fallback for any topic we cannot place. */
export const DEFAULT_COVER = '/images/covers/general.jpg';

/**
 * Word-boundary match, so "revolution" does not match "evolution" and
 * "cell" does not match "excellent".
 */
function hasWord(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

/** Return the cover image path for a lesson topic. */
export function coverFor(topic = '') {
  const t = String(topic).toLowerCase();
  for (const [key, words] of COVER_RULES) {
    if (words.some(w => hasWord(t, w))) return `/images/covers/${key}.jpg`;
  }
  return DEFAULT_COVER;
}

/* Arcade game artwork. */
const GAME_COVERS = {
  SUPER_QUIZ: '/images/games/quiz.jpg',
  WORD_SNAKE: '/images/games/words.jpg',
  CROSSWORD: '/images/games/crossword.jpg',
  CONCEPT_CHALLENGE: '/images/games/challenge.jpg',
};

export function gameCover(type) {
  return GAME_COVERS[type] || '/images/games/quiz.jpg';
}

/* On-brand illustrations used for empty states. */
export const ART = {
  library: '/images/empty/library.svg',
  progress: '/images/empty/progress.svg',
};

/**
 * Hide a broken image so the CSS gradient underneath shows through instead.
 * Used as an onError handler - a missing file should never look broken.
 */
export function hideBrokenImage(event) {
  const el = event.currentTarget;
  el.style.display = 'none';
}
