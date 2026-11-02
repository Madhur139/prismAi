/*
  GAME DATA
  - Names, icons, colours and one-line descriptions for every game type.
  - Add/edit game definitions here.
*/
export const GAME_META = {
  MULTIPLE_CHOICE: { label: 'Multiple choice', icon: 'list', color: '#7c6cff', blurb: 'Pick the right option' },
  FILL_BLANK: { label: 'Fill in the blank', icon: 'pencil', color: '#f59e0b', blurb: 'Type the missing word' },
  WORD_SNAKE: { label: 'Word Snake', icon: 'snake', color: '#10b981', blurb: 'Guide the snake through letters' },
  CROSSWORD: { label: 'Snake Crossword', icon: 'grid', color: '#c05cf5', blurb: 'Solve a snake crossword' },
  SUPER_QUIZ: { label: 'Super Quiz', icon: 'bolt', color: '#f43f5e', blurb: 'Fast, tricky questions' },
  DIAGRAM_HOTSPOT: { label: 'Diagram Hotspot', icon: 'target', color: '#06b6d4', blurb: 'Tap the right spot on a diagram' },
  TRUE_FALSE: { label: 'True or False', icon: 'scale', color: '#22c6e8', blurb: 'Is the statement true?' },
  ORDERING: { label: 'Ordering', icon: 'sort', color: '#8b5cf6', blurb: 'Put the steps in order' },
  MATCH_PAIRS: { label: 'Match the Pairs', icon: 'link', color: '#ec4899', blurb: 'Match terms to meanings' },
  MATH_SPRINT: { label: 'Math Sprint', icon: 'calculator', color: '#f97316', blurb: 'Quick arithmetic answers' },
  ODD_ONE_OUT: { label: 'Odd One Out', icon: 'eye', color: '#eab308', blurb: 'Spot the one that does not fit' },
  TWO_TRUE_ONE_FALSE: { label: 'True or False x3', icon: 'scale', color: '#14b8a6', blurb: 'Two are true — find the false one' },
  ANAGRAM: { label: 'Anagram', icon: 'shuffle', color: '#f97316', blurb: 'Unscramble the word' },
  CLOZE: { label: 'Cloze', icon: 'text', color: '#0ea5e9', blurb: 'Fill the gaps in the sentence' },
  MEMORY_MATCH: { label: 'Memory Match', icon: 'cards', color: '#a855f7', blurb: 'Flip and find every pair' },
  ODD_EQUATION: { label: 'Odd Equation', icon: 'calculator', color: '#ef4444', blurb: 'Which sum is wrong?' },
  WORD_LADDER: { label: 'Word Ladder', icon: 'ladder', color: '#22c55e', blurb: 'One letter changes each rung' },
  CODE_OUTPUT: { label: 'Code Output', icon: 'code', color: '#6366f1', blurb: 'What does this code print?' },
  CHART_QUESTION: { label: 'Chart Question', icon: 'chart', color: '#d946ef', blurb: 'Read the chart and answer' },
  MULTI_LABEL: { label: 'Multi Label', icon: 'target', color: '#0891b2', blurb: 'Click every part of the diagram' },
  SENTENCE_UNSCRAMBLE: { label: 'Sentence Scramble', icon: 'shuffle', color: '#db2777', blurb: 'Rebuild the sentence' },
  TIMELINE: { label: 'Timeline', icon: 'clock', color: '#059669', blurb: 'Put the events in order' },
};
export const GAME_LABELS = Object.fromEntries(Object.entries(GAME_META).map(([k, v]) => [k, v.label]));
export const GAME_COLORS = Object.fromEntries(Object.entries(GAME_META).map(([k, v]) => [k, v.color]));
export const GAME_BLURB = Object.fromEntries(Object.entries(GAME_META).map(([k, v]) => [k, v.blurb]));
export const gameIcon = (t) => GAME_META[t]?.icon || 'sparkles';

/* Difficulty levels: 1 = easy, 2 = normal, 3 = hard. */
export const LEVEL_NAMES = { 1: 'Easy', 2: 'Normal', 3: 'Hard' };
export const LEVEL_COLORS = { 1: '#22c6e8', 2: '#7c6cff', 3: '#f43f5e' };

/* The four quick-play arcade modes shown on the Arcade page. */
export const ARCADE = [
  { type: 'SUPER_QUIZ', icon: 'bolt', title: 'Super Quiz', text: 'Rapid-fire questions against the clock. Keep your streak alive.', color: '#f43f5e', time: 20 },
  { type: 'WORD_SNAKE', icon: 'snake', title: 'Word Snake', text: 'Rebuild the hidden word letter by letter before time runs out.', color: '#10b981', time: 35 },
  { type: 'CROSSWORD', icon: 'grid', title: 'Snake Crossword', text: 'Crack interlocking clues and watch the grid light up.', color: '#c05cf5', time: 0 },
  { type: 'CONCEPT_CHALLENGE', icon: 'target', title: 'Concept Challenge', text: 'A mixed bag of choice, true/false, matching and fill-in questions to test real understanding.', color: '#06b6d4', time: 30 },
];

/*
  MINI GAMES
  - Standalone skill games that live on their own page: #/play/mini/<type>
  - They use their own content bank, so they never touch a lesson, the
    backend, XP or progress. Best scores are kept in the browser.
*/
export const MINI_GAMES = [
  { type: 'CONCEPT_MATCH', icon: 'grid', title: 'Concept Match', text: 'Flip the cards and match every term to its meaning.', color: '#7c6cff' },
  { type: 'WORD_DETECTIVE', icon: 'search', title: 'Word Detective', text: 'Read the hint, reveal the hidden word, do not run out of lives.', color: '#f43f5e' },
  { type: 'NUMBER_SUDOKU', icon: 'layers', title: 'Number Sudoku', text: 'Fill the grid so every row, column and box checks out.', color: '#06b6d4' },
  { type: 'LOGIC_MINES', icon: 'target', title: 'Logic Mines', text: 'Use the numbers to find the hazards and clear the grid.', color: '#f59e0b' },
  { type: 'REACTION_SPRINT', icon: 'bolt', title: 'Reaction Sprint', text: 'Wait for green, then tap as fast as you can. Five rounds.', color: '#10b981' },
];
