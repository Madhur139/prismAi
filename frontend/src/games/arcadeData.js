/*
  ARCADE DATA
  - Quick-play rounds. Questions come from the learner's own lessons first;
    these built-in banks fill in so the arcade always has something to play.
*/
import { shuffle } from '../utils/helpers.js';

const q = (conceptName, prompt, answer, options, explanation, type = 'SUPER_QUIZ') => ({ conceptName, game: { type, prompt, answer, options, explanation } });
const w = (conceptName, prompt, answer, explanation) => ({ conceptName, game: { type: 'WORD_SNAKE', prompt, answer, targetWords: [answer], explanation } });
const f = (conceptName, prompt, answer, explanation) => ({ conceptName, game: { type: 'FILL_BLANK', prompt, answer, explanation } });
const cw = (conceptName, prompt, clues) => ({ conceptName, game: { type: 'CROSSWORD', prompt, clues: clues.map(([word, clue]) => ({ word, answer: word, clue })) } });

const BANK = {
  SUPER_QUIZ: [
    q('JavaScript', 'Which array method creates a new array by transforming every item?', 'map', ['map', 'filter', 'forEach', 'pop'], 'map() returns a new array with each item transformed.'),
    q('Science', 'Which gas do plants take in during photosynthesis?', 'Carbon dioxide', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Hydrogen'], 'Plants use CO₂, water and light to make glucose.'),
    q('Web', 'Which CSS property turns an element into a flex container?', 'display', ['position', 'display', 'flex', 'align-items'], 'Use display: flex to create a flex container.'),
    q('Geography', 'Which is the largest ocean on Earth?', 'Pacific', ['Atlantic', 'Indian', 'Pacific', 'Arctic'], 'The Pacific covers about a third of the planet.'),
    q('Math', 'What is 12 × 12?', '144', ['124', '132', '144', '156'], '12 × 12 = 144.'),
    q('Biology', 'Which organelle produces most of a cell’s energy?', 'Mitochondria', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 'Mitochondria generate ATP.'),
    q('Physics', 'What force pulls objects toward Earth?', 'Gravity', ['Magnetism', 'Friction', 'Gravity', 'Tension'], 'Gravity attracts objects with mass.'),
    q('History', 'In which year did World War II end?', '1945', ['1939', '1943', '1945', '1950'], 'WWII ended in 1945.'),
    q('JavaScript', 'What does JSON stand for?', 'JavaScript Object Notation', ['JavaScript Object Notation', 'Java Standard Object Names', 'JavaScript Online Network', 'Joined Script Object Notes'], 'JSON is a lightweight text data format.'),
    q('Chemistry', 'What is the chemical symbol for gold?', 'Au', ['Ag', 'Au', 'Go', 'Gd'], 'Au comes from the Latin “aurum”.'),
  ],
  WORD_SNAKE: [
    w('JavaScript', 'Build the word for an ordered collection of values.', 'ARRAY', 'An array stores values in order.'),
    w('JavaScript', 'Build the method that adds an item to the end of an array.', 'PUSH', 'push() appends to the end.'),
    w('Science', 'Build the pigment plants use to capture light.', 'CHLOROPHYLL', 'Chlorophyll absorbs light for photosynthesis.'),
    w('Space', 'Build the name of our home galaxy.', 'MILKYWAY', 'Our solar system sits in the Milky Way.'),
    w('Web', 'Build the language that styles web pages.', 'CSS', 'CSS controls presentation.'),
    w('Biology', 'Build the basic unit of life.', 'CELL', 'All living things are made of cells.'),
    w('Math', 'Build the name of a three-sided shape.', 'TRIANGLE', 'A triangle has three sides.'),
    w('Chemistry', 'Build the lightest element.', 'HYDROGEN', 'Hydrogen has atomic number 1.'),
  ],
  CONCEPT_CHALLENGE: [
    q('JavaScript', 'What is the first index of a JavaScript array?', '0', ['0', '1', '-1', 'length'], 'Arrays are zero-indexed.', 'MULTIPLE_CHOICE'),
    q('JavaScript', 'Which method keeps only the items that pass a test?', 'filter', ['map', 'filter', 'reduce', 'push'], 'filter() returns the matching items.', 'MULTIPLE_CHOICE'),
    f('CSS', 'Complete: display: ____ makes an element a flex container.', 'flex', 'The value flex activates Flexbox.'),
    f('Science', 'Water is made of hydrogen and ____.', 'oxygen', 'H₂O: two hydrogen atoms and one oxygen atom.'),
    q('Math', 'What is the value of π rounded to two decimals?', '3.14', ['3.12', '3.14', '3.16', '3.41'], 'π ≈ 3.14159.', 'MULTIPLE_CHOICE'),
    f('Geography', 'The capital of France is ____.', 'Paris', 'Paris has been the capital for centuries.'),
    q('Biology', 'Which blood cells carry oxygen?', 'Red blood cells', ['White blood cells', 'Red blood cells', 'Platelets', 'Plasma'], 'Haemoglobin in red cells binds oxygen.', 'MULTIPLE_CHOICE'),
    f('Physics', 'The unit of force is the ____.', 'newton', 'Force is measured in newtons (N).'),
  ],
  CROSSWORD: [
    cw('JavaScript', 'Solve the JavaScript crossword.', [['FUNCTION', 'A reusable block of code'], ['ARRAY', 'An ordered collection of values'], ['VARIABLE', 'A named container for a value'], ['LOOP', 'Repeats code while a condition holds'], ['STRING', 'A sequence of text characters'], ['BOOLEAN', 'True or false']]),
    cw('Science', 'Solve the science crossword.', [['PLANET', 'Earth is one'], ['GRAVITY', 'Pulls objects toward each other'], ['ATOM', 'Basic unit of an element'], ['OXYGEN', 'Gas we breathe in'], ['ENERGY', 'The ability to do work'], ['CELL', 'Basic unit of life']]),
    cw('Geography', 'Solve the geography crossword.', [['CONTINENT', 'Asia and Africa are examples'], ['OCEAN', 'A vast body of salt water'], ['DESERT', 'Very dry, like the Sahara'], ['RIVER', 'Flows toward the sea'], ['ISLAND', 'Land surrounded by water'], ['MOUNTAIN', 'Everest is the tallest']]),
  ],
};

const CFG = {
  SUPER_QUIZ: { types: ['SUPER_QUIZ', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ODD_ONE_OUT', 'TWO_TRUE_ONE_FALSE'], n: 10 },
  WORD_SNAKE: { types: ['WORD_SNAKE', 'ANAGRAM'], n: 8 },
  CROSSWORD: { types: ['CROSSWORD'], n: 3 },
  CONCEPT_CHALLENGE: {
    types: ['MULTIPLE_CHOICE', 'FILL_BLANK', 'TRUE_FALSE', 'MATH_SPRINT', 'MATCH_PAIRS', 'ORDERING', 'CLOZE', 'MEMORY_MATCH', 'TIMELINE', 'SENTENCE_UNSCRAMBLE', 'CHART_QUESTION', 'WORD_LADDER', 'ODD_EQUATION', 'CODE_OUTPUT'],
    n: 8,
  },
};

/** Build a shuffled set of rounds: the learner's own lesson games first, built-ins as backup. */
export function buildArcade(type, lessons = []) {
  const cfg = CFG[type]; if (!cfg) return [];
  const own = [];
  lessons.forEach(l => (l.concepts || []).forEach(c => (c.microGames || []).forEach(g => { if (cfg.types.includes(g.type)) own.push({ conceptName: c.conceptName, game: g, lessonId: l._id }); })));
  return [...shuffle(own), ...shuffle(BANK[type] || [])].slice(0, cfg.n);
}
