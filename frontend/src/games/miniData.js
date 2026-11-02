/*
  MINI GAME CONTENT
  - Self-contained question banks for the standalone mini games.
  - Nothing here is fetched from the backend: the games work offline and never
    touch a lesson, so they never affect XP or progress.
*/

/*
  CONCEPT MATCH - a term and its meaning. `subject` is only used as a label.
*/
export const CONCEPT_PAIRS = [
  { subject: 'Biology', term: 'Photosynthesis', def: 'Turning light energy into chemical energy' },
  { subject: 'Biology', term: 'Mitochondrion', def: 'The organelle that releases energy from food' },
  { subject: 'Biology', term: 'Enzyme', def: 'A molecule that speeds up a chemical reaction' },
  { subject: 'Biology', term: 'Osmosis', def: 'Movement of water across a semi-permeable membrane' },
  { subject: 'Biology', term: 'Natural selection', def: 'Survival of the best adapted to an environment' },
  { subject: 'Physics', term: 'Momentum', def: 'Mass multiplied by velocity' },
  { subject: 'Physics', term: 'Inertia', def: 'The tendency of an object to keep its state of motion' },
  { subject: 'Physics', term: 'Refraction', def: 'Bending of light as it changes medium' },
  { subject: 'Physics', term: 'Ohm’s law', def: 'Voltage equals current multiplied by resistance' },
  { subject: 'Chemistry', term: 'Catalyst', def: 'A substance that speeds a reaction without being used up' },
  { subject: 'Chemistry', term: 'Mole', def: 'The amount of substance containing 6.022 × 10²³ particles' },
  { subject: 'Chemistry', term: 'Oxidation', def: 'Loss of electrons, often involving oxygen' },
  { subject: 'Chemistry', term: 'Isotope', def: 'Atoms of an element with different neutron counts' },
  { subject: 'Mathematics', term: 'Prime number', def: 'A whole number divisible only by 1 and itself' },
  { subject: 'Mathematics', term: 'Derivative', def: 'The rate of change of a function' },
  { subject: 'Mathematics', term: 'Hypotenuse', def: 'The longest side of a right-angled triangle' },
  { subject: 'Mathematics', term: 'Sequence', def: 'An ordered list of numbers following a rule' },
  { subject: 'Geography', term: 'Latitude', def: 'Distance north or south of the equator' },
  { subject: 'Geography', term: 'Plate tectonics', def: 'The movement of the Earth’s rigid outer plates' },
  { subject: 'Geography', term: 'Monsoon', def: 'A seasonal reversal of wind that brings heavy rain' },
  { subject: 'History', term: 'Renaissance', def: 'The revival of classical learning in Europe' },
  { subject: 'History', term: 'Industrial Revolution', def: 'The shift to machine-made mass production' },
  { subject: 'History', term: 'Treaty', def: 'A formal agreement between states' },
  { subject: 'Computing', term: 'Algorithm', def: 'A finite set of clear steps to solve a problem' },
  { subject: 'Computing', term: 'Recursion', def: 'A function that solves a problem by calling itself' },
  { subject: 'Computing', term: 'Database', def: 'An organised store of related data' },
];

/*
  WORD DETECTIVE - a hidden word plus the hint that reveals it.
  `length` is used to show how many letters are missing.
*/
export const DETECTIVE_WORDS = [
  { word: 'PHOTOSYNTHESIS', hint: 'How a plant turns sunlight into sugar', category: 'Biology' },
  { word: 'GRAVITY', hint: 'The force that pulls objects toward the ground', category: 'Physics' },
  { word: 'CATALYST', hint: 'Speeds up a reaction without being used up', category: 'Chemistry' },
  { word: 'EVOLUTION', hint: 'Species change over many generations', category: 'Biology' },
  { word: 'ALGORITHM', hint: 'A recipe of steps a computer follows', category: 'Computing' },
  { word: 'MAGNETISM', hint: 'Attraction or repulsion between magnetic poles', category: 'Physics' },
  { word: 'FRACTION', hint: 'A part of a whole written as a ratio', category: 'Mathematics' },
  { word: 'CONTINENT', hint: 'One of Earth’s seven large landmasses', category: 'Geography' },
  { word: 'RENAISSANCE', hint: 'European revival of art, science and learning', category: 'History' },
  { word: 'VACCINE', hint: 'A preparation that teaches the body to fight a disease', category: 'Biology' },
  { word: 'TELESCOPE', hint: 'An instrument that makes distant objects look nearer', category: 'Astronomy' },
  { word: 'COMPOUND', hint: 'A substance made of two or more elements joined together', category: 'Chemistry' },
  { word: 'ECLIPSE', hint: 'One body passing in front of another in the sky', category: 'Astronomy' },
  { word: 'PRIME', hint: 'A whole number with exactly two factors', category: 'Mathematics' },
  { word: 'SEPARATE', hint: 'To move something into a different place', category: 'Science' },
  { word: 'ORBIT', hint: 'The curved path one body takes around another', category: 'Astronomy' },
  { word: 'ISOTOPE', hint: 'Atoms of one element that differ in neutrons', category: 'Chemistry' },
  { word: 'HYPOTHESIS', hint: 'A testable idea about what might be true', category: 'Science' },
  { word: 'ATMOSPHERE', hint: 'The layer of gases surrounding the Earth', category: 'Geography' },
  { word: 'REVOLUTION', hint: 'A sudden and radical change in society', category: 'History' },
  { word: 'ECOSYSTEM', hint: 'Living things and their surroundings together', category: 'Biology' },
  { word: 'CALCULUS', hint: 'The maths of change and rates', category: 'Mathematics' },
  { word: 'ENTROPY', hint: 'The tendency of energy to spread out', category: 'Physics' },
  { word: 'PARABOLA', hint: 'A U-shaped curve on a graph', category: 'Mathematics' },
  { word: 'PARTICLE', hint: 'A tiny piece of matter such as an atom', category: 'Physics' },
  { word: 'CATALYSIS', hint: 'Speeding up a reaction with a catalyst', category: 'Chemistry' },
  { word: 'MEIOSIS', hint: 'Cell division that makes gametes', category: 'Biology' },
  { word: 'GLACIER', hint: 'A slow-moving river of ice', category: 'Geography' },
  { word: 'SQUARE', hint: 'A shape with four equal sides, or a number multiplied by itself', category: 'Mathematics' },
  { word: 'VARIATION', hint: 'The difference between individuals in a population', category: 'Biology' },
];

/* Word length ranges per difficulty for Word Detective. */
export const DETECTIVE_LENGTHS = { easy: [3, 7], medium: [8, 9], hard: [10, 20] };

/* How many mistakes you can make per difficulty. */
export const DETECTIVE_LIVES = { easy: 6, medium: 5, hard: 4 };

/* How many concept pairs the memory game deals at each difficulty. */
export const MATCH_SIZES = { easy: 4, medium: 6, hard: 8 };

/* Sudoku grid size per difficulty. */
export const SUDOKU_SIZES = { easy: 4, medium: 6, hard: 9 };

/* Minesweeper board size and mine count per difficulty. */
export const MINES_SIZES = {
  easy: { cols: 8, rows: 8, mines: 10 },
  medium: { cols: 10, rows: 10, mines: 20 },
  hard: { cols: 12, rows: 12, mines: 40 },
};

/* Reaction test: how many rounds and the delay window before the signal. */
export const REACTION_ROUNDS = 5;
export const REACTION_MIN_DELAY = 1200;
export const REACTION_MAX_DELAY = 4000;

/* Difficulty metadata shared by every mini game. */
export const DIFFICULTIES = [
  { key: 'easy', label: 'Easy', icon: 'sun' },
  { key: 'medium', label: 'Medium', icon: 'target' },
  { key: 'hard', label: 'Hard', icon: 'flame' },
];
