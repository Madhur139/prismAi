/*
  ROUND VIEW - one question/round of any game type, with feedback and a Continue button.
  Used by both the lesson player and the arcade player.
  onNext receives { conceptName, gameType, correct, timeMs }.
*/
import React, { useState, useEffect, useRef } from 'react';
import { GAME_META } from '../constants/games.js';
import { GameBadge } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { WhyCard } from '../components/WhyCard.jsx';
import { AutopsyCard } from '../components/AutopsyCard.jsx';
import { AskHelp } from '../components/AskHelp.jsx';
import { api } from '../api/client.js';
import { normalize, usableHint } from '../utils/helpers.js';
import { playTone } from '../utils/sound.js';
import { speak, listen, matchSpoken, canListen } from '../utils/voice.js';
import { voiceSetting } from '../utils/settings.js';
import { ChoiceGame } from './ChoiceGame.jsx';
import { FillGame } from './FillGame.jsx';
import { Hotspot } from './Hotspot.jsx';
import { MatchPairs } from './MatchPairs.jsx';
import { MathSprint } from './MathSprint.jsx';
import { OrderGame } from './OrderGame.jsx';
import { SnakeCrossword } from './SnakeCrossword.jsx';
import { TrueFalse } from './TrueFalse.jsx';
import { WordSnake } from './WordSnake.jsx';
import { Anagram } from './Anagram.jsx';
import { ChartQuestion } from './ChartQuestion.jsx';
import { Cloze } from './Cloze.jsx';
import { CodeOutput } from './CodeOutput.jsx';
import { MemoryMatch } from './MemoryMatch.jsx';
import { MultiLabel } from './MultiLabel.jsx';
import { OddEquation } from './OddEquation.jsx';
import { OddOneOut } from './OddOneOut.jsx';
import { SentenceUnscramble } from './SentenceUnscramble.jsx';
import { Timeline } from './Timeline.jsx';
import { TwoTrueOneFalse } from './TwoTrueOneFalse.jsx';
import { WordLadder } from './WordLadder.jsx';

const PRAISE = ['Correct!', 'Nailed it!', 'Spot on!', 'Brilliant!', 'Yes!'];

/* Numbers are compared as numbers, so "96" and "96.00" both count as right. */
const numEq = (a, b) => {
  const x = parseFloat(String(a ?? '').replace(/,/g, ''));
  const y = parseFloat(String(b ?? '').replace(/,/g, ''));
  return !Number.isNaN(x) && !Number.isNaN(y) && Math.abs(x - y) < 1e-6;
};

export function RoundView({ round, imageUrl, index, total, onNext, timeLimit = 0, nextLabel, topic, exam = false, lessonId, conceptIndex, gameIndex }) {
  const game = round.game, isCW = game.type === 'CROSSWORD';
  const [res, setRes] = useState(null), [value, setValue] = useState(''), [hint, setHint] = useState(false), [left, setLeft] = useState(timeLimit);
  const [listening, setListening] = useState(false), [heard, setHeard] = useState('');
  // The help board: an open question and the answer that came back for it.
  const [asking, setAsking] = useState(false), [helpId, setHelpId] = useState(null), [helpAnswer, setHelpAnswer] = useState(null);
  const [showAutopsy, setShowAutopsy] = useState(false);
  const started = useRef(Date.now()), doneRef = useRef(false), nextRef = useRef(false), praise = useRef(PRAISE[Math.floor(Math.random() * PRAISE.length)]);

  const finish = (correct, v = '', timedOut = false) => {
    if (doneRef.current) return; doneRef.current = true;
    setRes({ correct, value: v, timedOut, timeMs: Date.now() - started.current }); playTone(correct);
  };
  // Each game type knows how to compare its own answer.
  const check = v => game.type === 'MATH_SPRINT' ? numEq(v, game.answer) : normalize(v) === normalize(game.answer);
  const answer = v => { setValue(v); finish(check(v), v); };
  const next = () => { if (!res || nextRef.current) return; nextRef.current = true; onNext({ conceptName: round.conceptName, gameType: game.type, correct: res.correct, timeMs: res.timeMs, hintUsed: !!hint, askedHelp: !!helpId, prompt: game.prompt, userAnswer: res.value, explanation: game.explanation, game }); };

  /*
    VOICE MODE
    The question is read out loud, and the learner can answer by speaking:
    "true", the text of an option, or a number. Everything happens in the
    browser — no audio is sent anywhere.
  */
  const voiceOn = voiceSetting();
  const speakText = game.type === 'TRUE_FALSE' || game.type === 'CLOZE' ? game.prompt : `${game.prompt}${game.options?.length ? '. Options: ' + game.options.join('. ') : ''}`;

  useEffect(() => {
    if (!voiceOn || res) return;
    const stop = speak(speakText);
    return () => stop();
  }, [voiceOn, game.prompt, res]);

  const onMic = async () => {
    if (listening || res) return;
    setListening(true); setHeard('');
    const said = await listen();
    setListening(false);
    if (!said) return;
    setHeard(said);

    // 1) a game with options: answer with the option that was said
    if (game.options?.length) {
      const pick = matchSpoken(said, game.options);
      if (pick) { answer(pick); return; }
    }
    // 2) true or false
    if (game.type === 'TRUE_FALSE') {
      const s = said.toLowerCase();
      if (/\b(true|yes|correct|right)\b/.test(s)) { answer('true'); return; }
      if (/\b(false|no|incorrect|wrong)\b/.test(s)) { answer('false'); return; }
    }
    // 3) a game with a text box: put the words in it
    setValue(said);
  };

  // EXAM MODE: no feedback, the round moves on by itself
  useEffect(() => {
    if (!exam || !res) return;
    const t = setTimeout(() => next(), 650);
    return () => clearTimeout(t);
  }, [exam, res]);

  // countdown (not for crosswords)
  const timed = timeLimit > 0 && !isCW;
  useEffect(() => { if (!timed || res) return; const id = setInterval(() => setLeft(t => t - 1), 1000); return () => clearInterval(id); }, [timed, res]);
  useEffect(() => { if (timed && !res && left <= 0) finish(false, '', true); }, [left]);

  // Enter = continue
  useEffect(() => {
    if (!res) return;
    const f = e => { if (e.key === 'Enter' && !e.repeat) { e.preventDefault(); next(); } };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  }, [res]);

  /*
    HELP BOARD
    Once the question is posted, the game keeps an eye out for an answer.
    When somebody gets it right, the answer is offered right here.
  */
  useEffect(() => {
    if (!helpId || res) return;
    let live = true;
    const check = async () => {
      try {
        const d = await api(`/help/${helpId}`);
        if (!live) return;
        const good = (d.request?.answers || []).find(a => a.correct);
        // The server hands the asker the exact answer, so the round can be
        // marked right even when the helper wrote it in their own words.
        if (good) setHelpAnswer({ ...good, exact: d.request?.correctAnswer || good.text });
      } catch { /* the board may be offline; try again in a moment */ }
    };
    check();
    const id = setInterval(check, 5000);
    return () => { live = false; clearInterval(id); };
  }, [helpId, res]);

  const hasOpts = Array.isArray(game.options) && game.options.length > 1;
  // Some game types need extra data. If it is missing we skip the round instead
  // of showing a broken board.
  const hasSteps = Array.isArray(game.steps) && game.steps.length >= 3;
  const hasPairs = Array.isArray(game.pairs) && game.pairs.length >= 3;
  const hasPicture = !!imageUrl || !!game.svg; // a photo, or a diagram we drew
  const broken = (game.type === 'ORDERING' && !hasSteps) || (game.type === 'MATCH_PAIRS' && !hasPairs) || (game.type === 'TIMELINE' && !hasSteps) || (game.type === 'MULTI_LABEL' && !hasPicture);

  const body = isCW ? <SnakeCrossword game={game} onResolve={ok => finish(ok)} />
    : broken ? <div className="cw-empty-note"><p>This game could not be built from its data.</p><button className="btn ghost" onClick={() => finish(false)}>Skip</button></div>
    : game.type === 'DIAGRAM_HOTSPOT' && hasPicture ? <Hotspot game={game} imageUrl={imageUrl} submitted={!!res} onAnswer={answer} />
    : (game.type === 'MULTIPLE_CHOICE' || game.type === 'SUPER_QUIZ') && hasOpts ? <ChoiceGame game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'TRUE_FALSE' ? <TrueFalse game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'ORDERING' ? <OrderGame game={game} submitted={!!res} onResolve={ok => finish(ok)} />
    : game.type === 'MATCH_PAIRS' ? <MatchPairs game={game} submitted={!!res} onResolve={ok => finish(ok)} />
    : game.type === 'MATH_SPRINT' ? <MathSprint game={game} value={value} setValue={setValue} submitted={!!res} onAnswer={answer} />
    : game.type === 'WORD_SNAKE' && (game.targetWords?.[0] || game.answer) ? <WordSnake game={game} submitted={!!res} onAnswer={answer} />
    : game.type === 'ODD_ONE_OUT' ? <OddOneOut game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'TWO_TRUE_ONE_FALSE' ? <TwoTrueOneFalse game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'ANAGRAM' ? <Anagram game={game} submitted={!!res} onAnswer={answer} />
    : game.type === 'CLOZE' ? <Cloze game={game} submitted={!!res} onAnswer={answer} voiceText={heard} />
    : game.type === 'MEMORY_MATCH' ? <MemoryMatch game={game} submitted={!!res} onResolve={ok => finish(ok)} />
    : game.type === 'ODD_EQUATION' ? <OddEquation game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'WORD_LADDER' ? <WordLadder game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'CODE_OUTPUT' ? <CodeOutput game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'CHART_QUESTION' ? <ChartQuestion game={game} value={value} submitted={!!res} onAnswer={answer} />
    : game.type === 'MULTI_LABEL' && hasPicture ? <MultiLabel game={game} imageUrl={imageUrl} submitted={!!res} onAnswer={answer} />
    : game.type === 'SENTENCE_UNSCRAMBLE' ? <SentenceUnscramble game={game} submitted={!!res} onAnswer={answer} />
    : game.type === 'TIMELINE' ? <Timeline game={game} submitted={!!res} onResolve={ok => finish(ok)} />
    : <FillGame value={value} setValue={setValue} submitted={!!res} onAnswer={answer} />;

  const shownAnswer = game.type === 'DIAGRAM_HOTSPOT' ? (game.hotspot?.label || game.answer) : game.answer;
  // A hint that is only a number or a calculation is not a hint - never show it.
  const hintText = usableHint(game.hint);
  // The true/false and cloze games show their text inside their own panel,
  // so no double heading.
  const hidePrompt = game.type === 'TRUE_FALSE' || game.type === 'CLOZE';

  return (
    <div className="stage">
      <div className="stage-top">
        <GameBadge type={game.type} />
        <span className="concept-pill">{round.conceptName}</span>
        <span className="round-count">{index + 1} / {total}</span>
        {timed && <span className={`timer ${left <= 5 && !res ? 'low' : ''}`}><Icon name="clock" size={15} />{Math.max(0, left)}s</span>}
        {voiceOn && !res && canListen() && (
          <button className={`mic-btn ${listening ? 'on' : ''}`} onClick={onMic} title="Answer by speaking" aria-label="Answer by speaking">
            <Icon name="mic" size={16} />
            <span>{listening ? 'Listening…' : 'Speak'}</span>
          </button>
        )}
        {!res && !exam && !isCW && (
          <button className={`help-btn ${helpId ? 'asked' : ''}`} onClick={() => setAsking(true)} title="Ask other learners for help" aria-label="Ask for help">
            <Icon name="users" size={16} />
            <span>{helpId ? 'Waiting for help…' : 'Stuck?'}</span>
          </button>
        )}
      </div>
      {heard && !res && <p className="heard-line" aria-live="polite"><Icon name="mic" size={14} /> Heard: “{heard}”</p>}
      {helpId && !helpAnswer && !res && (
        <div className="help-waiting" role="status"><Icon name="clock" size={15} /> Your question is on the board. We will show the answer here as soon as somebody helps.</div>
      )}
      {helpAnswer && !res && (
        <div className="help-answer" role="status">
          <div className="help-answer-head"><Icon name="sparkles" size={15} /><b>{helpAnswer.userName} helped you out</b></div>
          <p>{helpAnswer.text}</p>
          <button className="btn primary sm" onClick={() => answer(helpAnswer.exact || helpAnswer.text)}>Use this answer <Icon name="check" size={16} /></button>
          <small>This one earns no XP — the helper gets it.</small>
        </div>
      )}
      {timed && <div className="timebar"><i style={{ width: `${Math.max(0, left) / timeLimit * 100}%`, transitionDuration: res ? '0s' : '1s' }} /></div>}
      {!isCW && !hidePrompt && <h2 className="prompt">{game.prompt}</h2>}
      {body}
      {!res && !exam && hintText && !isCW && (hint ? <p className="hint-box"><Icon name="sparkles" size={16} /> {hintText}</p> : <button className="link-btn" onClick={() => setHint(true)}>Need a hint?</button>)}
      {res && !isCW && !exam && <WhyCard correct={res.correct} question={game.prompt} answer={shownAnswer} userAnswer={value} explanation={game.explanation} topic={topic || round.conceptName} />}
      {res && !res.correct && !isCW && !exam && showAutopsy && (
        <AutopsyCard
          question={game.prompt}
          correctAnswer={shownAnswer}
          userAnswer={value}
          topic={topic || round.conceptName}
          explanation={game.explanation}
          onPractice={q => { setShowAutopsy(false); /* caller can hook into practice */ }}
        />
      )}
      {res && !res.correct && !isCW && !exam && !showAutopsy && (
        <button className="link-btn autopsy-trigger" onClick={() => setShowAutopsy(true)} style={{ marginTop: '8px', display: 'inline-block' }}>
          <Icon name="alert" size={14} /> Autopsy this mistake
        </button>
      )}
      {res && !exam && (
        <div className={`feedback ${res.correct ? 'good' : 'bad'}`} role="status">
          <div className="fb-main">
            <span className="fb-ico"><Icon name={res.correct ? 'check' : 'x'} size={22} stroke={3} /></span>
            <div>
              <b>{res.timedOut ? "Time's up!" : res.correct ? praise.current : isCW ? 'Skipped' : 'Not quite'}</b>
              {!res.correct && !isCW && shownAnswer && <p>Answer: <strong>{shownAnswer}</strong></p>}
              {isCW && game.explanation && <p>{game.explanation}</p>}
            </div>
          </div>
          <button className="btn primary" onClick={next} autoFocus>{nextLabel || (index + 1 === total ? 'Finish' : 'Continue')} <Icon name="arrow-right" size={18} /></button>
        </div>
      )}
      {exam && res && <p className="hint-line exam-note">Answered — the next question is coming up.</p>}

      <AskHelp
        open={asking}
        onClose={() => setAsking(false)}
        game={game}
        conceptName={round.conceptName}
        lessonId={lessonId}
        conceptIndex={conceptIndex}
        gameIndex={gameIndex}
        onPosted={r => setHelpId(r?._id || null)}
      />
    </div>
  );
}
