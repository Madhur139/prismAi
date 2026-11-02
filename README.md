# Prism AI

One project, two folders:

```
prism-ai/
├── prism-backend/        API (Express + MongoDB + Gemini)  -> http://localhost:8080
└── frontend/             Website (React + Vite)            -> http://localhost:5173
```

## Run (2 terminals)

```bash
# one time
npm run install:all
cp prism-backend/.env.example prism-backend/.env     # fill MONGO_URI, JWT_SECRET, GEMINI_API_KEY
cp frontend/.env.example frontend/.env               # VITE_API_URL must match the backend PORT

# terminal 1                    # terminal 2
npm run dev:api                 npm run dev:web
```
Open http://localhost:5173

---

## What's inside

### Frontend (`frontend/src`)
| Folder | What is inside |
|--------|---------------|
| `main.jsx`, `App.jsx` | Start file and route switch (landing, auth, workspace, games) |
| `pages/` | Landing, Auth, Dashboard, Create lesson, Library, Lesson, Games (arcade), AI search, Profile, Settings, Play (full-screen games), Flashcards, Achievements, Write & AI check, Groups, Help, Teacher |
| `layout/Workspace.jsx` | Sidebar + top bar after login |
| `games/` | `RoundView` + 22 game engines (Choice, Fill, WordSnake, Crossword, TrueFalse, Order, MatchPairs, MathSprint, OddOneOut, TwoTrueOneFalse, Anagram, Cloze, MemoryMatch, OddEquation, WordLadder, CodeOutput, ChartQuestion, MultiLabel, SentenceUnscramble, Timeline) |
| `components/` | UI kit, icons, Flashcard creator, Pomodoro timer, Daily challenge, Autopsy card, Study together, Group chat, Invite bell, and more |
| `styles/app.css` | Design system — light/dark themes, subject colours, accessibility |
| `api/client.js`, `utils/`, `constants/` | Backend calls, router, helpers, sounds, game metadata |

### Backend (`prism-backend/server`)
| Folder | What is inside |
|--------|---------------|
| `config/` | env, DB, Cloudinary, Gemini, constants |
| `models/` | User, Lesson, UserProgress, GroupRoom, StudyGroup, Assignment, Duel, HelpRequest, CodeProject |
| `controllers/` | Auth, lessons, progress, AI (question/check/explain/autopsy), teacher, duel, group, help, invite |
| `routes/` | All `/api/*` endpoints |
| `services/` | Gemini AI, image storage, diagram generation, lesson import |
| `middleware/` | auth, async handler, error handler, rate limiters, upload |

---

## Routes

**App (inside Workspace):**
- `#/` landing, `#/login`, `#/register`
- `#/app` dashboard, `#/app/ai` Prism AI search, `#/app/create` new lesson
- `#/app/lessons` library, `#/app/lesson/<id>` open a lesson
- `#/app/review` spaced repetition + drill mistakes
- `#/app/write` Write & AI check, `#/app/games` arcade
- `#/app/flashcards` study as flashcards
- `#/app/achievements` badges & teacher mode
- `#/app/groups` study groups, `#/app/groups/<id>` group page (chat + study together)
- `#/app/help` help board, `#/app/profile`, `#/app/settings`

**Games (full-screen, no sidebar):**
- `#/play/lesson/<id>?cfg=...` practice / boss / exam mode
- `#/play/arcade/<TYPE>` quick play
- `#/play/write/<id\|free>` Write & AI check session

**Backend API (`/api/`):**
- `POST /api/auth/*` — login, register, role switch
- `POST /api/lessons/*` — create, import, regenerate, add games, add custom game, diagram, share, delete
- `GET /api/lessons/:id/session` — adaptive practice rounds
- `POST /api/ai/question`, `POST /api/ai/check`, `POST /api/ai/explain`, `POST /api/ai/autopsy` — AI write & check
- `POST /api/progress/submit`, `GET /api/progress/me`, `GET /api/progress/review`, `GET /api/progress/drill`
- `POST /api/groups/*` — groups, study together rooms, chat
- `POST /api/duel/*`, `POST /api/classduel/*` — live duels
- `POST /api/help/*` — help board
- `POST /api/invites/*` — invitations

---

## Core Features

### Learning
- **22 lesson game types** — multiple choice, fill in the blank, Word Snake, Snake Crossword, Super Quiz, Diagram Hotspot, True/False, Ordering, Match Pairs, Math Sprint, Odd One Out, Two True One False, Anagram, Cloze, Memory Match, Odd Equation, Word Ladder, Code Output, Chart Question, Multi Label, Sentence Scramble, Timeline.
- **Lessons hold 6-8 games per concept** — add more games any time from the lesson page.
- **Import** a PDF, YouTube video (captions), or pasted notes into a playable lesson.
- **Write & AI check** — write answers in your own words, get scored with feedback, strengths, improvements, and a model answer.
- **"Explain like I'm 5"** — toggle in Settings for simpler AI language.
- **Wrong-answer autopsy** — after a mistake, AI explains exactly why your answer was wrong plus a similar practice question.
- **Flashcards** — turn any lesson into front/back cards, or write your own manual flashcards. Export to Anki/Quizlet.
- **Mastery rings** per concept, difficulty ladder, exam mode, hints that cost XP.
- **Spaced repetition** — "Today's review" on the dashboard, drill your mistakes.
- **Voice mode** — questions read out loud, answer by speaking (browser only).
- **Generated diagrams** — click to draw a labelled diagram for any concept.
- **Pomodoro timer** — 25-minute focus sessions built into the app.

### Gamification
- **Badges / Achievements** — 12 badges: First Steps, On a Roll, Week Warrior, Perfect Ten, Lesson Master, Mistake Fixer, Night Owl, Early Bird, Flashcard Fan, Focus Mode, Teacher Mode, Helpful Hand.
- **XP & streaks** — XP decays as you master concepts, daily streak tracking.
- **Daily challenge** — one random question every day on the dashboard.
- **Live duels** — send a code to a friend and race through the same questions.

### Social & Classroom
- **Study groups** — make a group, invite friends, share lessons, group chat.
- **Study together** — live room where everybody answers the same questions simultaneously with a leaderboard.
- **Teacher mode** — class code, student list, homework assignments, progress reports.
- **Help board** — stuck? Post a question, other learners answer. Helpers earn XP.
- **Invitations** — group, lesson, or class invitations with Accept/Decline.
- **Shareable lesson links** — public read-only links.

### Accessibility & PWA
- Works **offline** (PWA)
- **Readable font** (dyslexia-friendly), **high contrast**, **reduce motion**
- **Subject themes** — auto, math, science, language, history
- **Dark mode** — persists locally

---

## Optional Google web search

Add to `prism-backend/.env`:
```env
GOOGLE_SEARCH_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_programmable_search_engine_id
```

---

## Easy code guide

See `CODE-GUIDE.md` for a beginner-friendly explanation of folders, routing, games, profile, settings, and AI.

---

## Files changed in the latest pass

**Added:**
- `frontend/src/pages/FlashcardsPage.jsx` — `#/app/flashcards`
- `frontend/src/pages/AchievementsPage.jsx` — `#/app/achievements`
- `frontend/src/components/ManualFlashcardCreator.jsx` — create your own flashcards
- `frontend/src/components/AutopsyCard.jsx` — wrong-answer autopsy UI
- `frontend/src/components/PomodoroTimer.jsx` — focus timer
- `frontend/src/components/DailyChallenge.jsx` — daily question card
- `frontend/src/components/CustomGameEditor.jsx` — write your own lesson questions
- `frontend/src/components/AchievementBadge.jsx` — badge display chip
- `frontend/src/utils/achievements.js` — badge definitions + checking logic
- `frontend/src/utils/stats.js` — badge-relevant stats store
- `frontend/src/utils/manualFlashcards.js` — manual flashcard storage
- `FEATURES_ROADMAP.md` — full feature roadmap

**Modified:**
- `frontend/src/layout/Workspace.jsx` — Flashcards & Achievements in sidebar nav
- `frontend/src/pages/SettingsPage.jsx` — subject theme + ELI5 toggle
- `frontend/src/pages/DashboardPage.jsx` — Daily Challenge section
- `frontend/src/pages/LessonPage.jsx` — "Add my question" button + custom editor modal
- `frontend/src/pages/PlayPage.jsx` — stat tracking for badges
- `frontend/src/games/RoundView.jsx` — autopsy button after wrong answers
- `frontend/src/styles/app.css` — badge, flashcard, pomodoro, daily-challenge, subject-theme CSS
- `prism-backend/server/controllers/answerController.js` — `explainLike5` + `autopsyAnswer`
- `prism-backend/server/controllers/lessonController.js` — `addCustomGame`
- `prism-backend/server/routes/aiRoutes.js` — `/api/ai/autopsy` route
- `prism-backend/server/routes/lessonRoutes.js` — `/api/lessons/:id/custom-game` route

**Removed:**
- `frontend/src/pages/CodeLabPage.jsx` — CodeLab removed
- `prism-backend/server/routes/codeRoutes.js`
- `prism-backend/server/controllers/codeController.js`
- `prism-backend/server/models/CodeProject.js`
- CodeLab CSS from `app.css`
