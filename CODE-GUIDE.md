# Prism AI — Easy Code Guide

This project uses **React + Vite + Tailwind CSS** on the frontend and **Node/Express** on the backend.

## 1. Frontend folder

`frontend/src/` contains the React application.

- `App.jsx` — main app/page selection and route handling.
- `main.jsx` — React entry point; mounts the app.
- `tailwind.css` — Tailwind entry stylesheet.
- `pages/` — full screens such as Dashboard, Games, Profile, Settings and Prism AI.
- `components/` — reusable UI pieces.
- `layout/Workspace.jsx` — shared sidebar/workspace layout.
- `games/` — actual playable game components.
- `utils/` — reusable helper, routing, settings and game logic.
- `constants/games.js` — game metadata.
- `api/client.js` — frontend API requests.
- `public/prism-logo.svg` — Prism logo asset.

## 2. Tailwind CSS

The UI uses Tailwind utility classes instead of a large collection of custom CSS files. Examples:

- `flex` = display flex
- `items-center` = vertically center flex children
- `justify-between` = spread children apart
- `p-4` = padding
- `px-6` / `py-3` = horizontal / vertical padding
- `mt-4` = margin-top
- `rounded-xl` = rounded corners
- `border` = border
- `bg-emerald-500` = background color
- `text-slate-700` = text color
- `shadow-sm` = small shadow
- `hover:*` = style while hovering
- `dark:*` = style used in dark mode
- `md:*`, `lg:*` = responsive breakpoints

Tailwind configuration is in `frontend/tailwind.config.js`.

## 3. Navigation

`frontend/src/utils/router.js` controls the lightweight client-side routing. It keeps the URL/history and visible screen synchronized, so the browser Back/Forward buttons work without refreshing the whole app.

## 4. Games

Each game is a React component in `frontend/src/games/`. There are **22** of them.

**The first six**

- `ChoiceGame.jsx` — multiple-choice questions.
- `WordSnake.jsx` — timed word game.
- `SnakeCrossword.jsx` — crossword-style game.
- `FillGame.jsx` — fill-in-the-blank questions.
- `Hotspot.jsx` — visual/target interaction.
- `Practice.jsx` — general practice mode.

**Added later**

- `TrueFalse.jsx` — judge a statement (True / False).
- `OrderGame.jsx` — put the steps of a process in the right order.
- `MatchPairs.jsx` — match every term to its meaning.
- `MathSprint.jsx` — quick arithmetic with a server-checked expression.
- `OddOneOut.jsx` / `TwoTrueOneFalse.jsx` — find the one that does not fit.
- `Anagram.jsx` — unscramble one word.
- `Cloze.jsx` — fill 2 or 3 gaps in a sentence.
- `MemoryMatch.jsx` — flip the cards and find every pair.
- `OddEquation.jsx` — which of the four sums is wrong?
- `WordLadder.jsx` — one letter changes at each rung.
- `CodeOutput.jsx` — what does this code print?
- `ChartQuestion.jsx` — read a chart and answer.
- `MultiLabel.jsx` — click EVERY part of the diagram.
- `SentenceUnscramble.jsx` — rebuild a sentence.
- `Timeline.jsx` — put dated events in order.

`components/game-room/` contains the setup/progress/result UI shared by game sessions.

### How a game type is added (all of them live together)

A new game type touches four places. Miss one and the app will not find it:

| Place | What to add |
|---|---|
| `prism-backend/server/config/constants.js` | the type name in `GAME_TYPES` and its XP in `XP_TABLE` |
| `prism-backend/server/utils/validateGame.js` | the rules for the new data (and clean-up of unused fields) |
| `prism-backend/server/services/geminiService.js` | the field in the AI schema and the plain-English rule in `GAME_RULES` |
| `frontend/src/constants/games.js` + `frontend/src/games/` | the label/colour in `GAME_META` and the engine component, then route it in `RoundView.jsx` |

The AI may only output DATA. The rules are checked again in plain code by
`validateGame.js`, so a wrong answer from the AI never reaches the learner.

## 5. Profile

`ProfilePage.jsx` handles the editable name and avatar. The avatar can be uploaded from the user's computer and stored in browser storage, so it can be shown again after a refresh.

## 6. Settings

`SettingsPage.jsx` is the UI. `utils/settings.js` is the storage/helper layer.

Dark mode, sound and notification preferences are kept separate from the page so they can be reused elsewhere.

## 7. Prism AI

`pages/AISearchPage.jsx` is the chat/search UI.
`api/client.js` sends the request.
`prism-backend/server.js` receives it and talks to the configured AI/search services.

**Important:** API keys belong in backend `.env`, never in frontend source files.

## 8. Backend

`prism-backend/server.js` is the Express server.

- API routes live here.
- Environment variables are loaded here.
- AI/search provider calls should stay server-side.
- `.env.example` documents the required variables without exposing secrets.

## 9. Where to edit common things

| Want to change | File to check |
|---|---|
| Sidebar links | `src/layout/Workspace.jsx` |
| Page navigation/back behavior | `src/utils/router.js` |
| Logo | `src/public/prism-logo.svg` |
| Profile/avatar behavior | `src/pages/ProfilePage.jsx` |
| Dark mode/settings | `src/pages/SettingsPage.jsx` + `src/utils/settings.js` |
| Games list | `src/constants/games.js` |
| Game behavior | `src/games/*.jsx` |
| Shared buttons/cards | `src/components/ui.jsx` |
| Tailwind theme | `tailwind.config.js` |
| AI/search API | `prism-backend/server.js` |

## 10. How to run

From the project root:

```bash
npm install
npm run dev
```

If the frontend/backend have separate package scripts in your version, follow their individual README instructions.

## 11. Comment style

I added short comments at the top of the important source files. When you add new code, keep comments focused on **why the code exists** and **what a beginner should know**, rather than commenting every obvious line.


## 12. Game pages (new)
Starting any game navigates to `#/play/...` (see `pages/PlayPage.jsx`). That page has no sidebar: just a progress bar, an exit button and the game. `games/RoundView.jsx` renders one round for every game type; `components/Summary.jsx` shows results and XP. Colours and spacing come from CSS variables at the top of `styles/app.css`.

## 13. More games in a lesson
- A lesson holds many games: the AI writes 6-8 games for every concept (4-6 concepts).
- On the lesson page, **Add game** adds one new game to a single concept and **Add more games** adds one to every concept. Both open a small picker where you choose the game type, or let the AI choose.
- The backend route is `POST /api/lessons/:id/add-games` with `{ conceptIndex?, count?, type? }`. It asks Gemini for the new game, checks it with the same `validateGame` rules as the rest of the lesson and only then saves it.

## 14. Study features
| Feature | Where it lives |
|---|---|
| Mastery rings per concept | `GET /api/progress/lesson/:id` → the lesson page draws a ring per concept |
| Review my weak spots | the lesson page sends the weak concepts to the session as `topics` |
| Difficulty ladder | every game has a `level` (1 easy, 2 normal, 3 hard); the game room filters by it |
| Exam mode | `PlayPage.jsx` — no feedback until the end, one score at the end |
| Hints cost XP | `HINT_XP_COST` in `constants.js`; the answer reports `hintUsed` |
| XP decays with mastery | `MASTERY_XP_DECAY` — aced concepts are worth less |
| Flashcard export | `utils/exportFlashcards.js` — a tab-separated deck for Anki / Quizlet |
| Sharing a lesson | `POST /api/lessons/:id/share` → a public `#/shared/<token>` page |
| Import material | `POST /api/lessons/import` — a PDF, a YouTube link or pasted notes |
| Spaced repetition | `srs` in `UserProgress` + `GET /api/progress/review` (the dashboard "Today's review") |
| Teacher mode | `pages/TeacherPage.jsx` + `controllers/teacherController.js` (class code, students, assignments) |
| Live duel | `pages/DuelPage.jsx` + `controllers/duelController.js` (two players, polled score) |
| Offline | `public/sw.js` + `public/manifest.webmanifest` (app shell only, never the API) |
| Accessibility | Settings → readable font, high contrast, reduce motion (`data-font`, `data-contrast`, `data-motion` on `<html>`) |

## 15. Drill my mistakes
- Every wrong answer is saved **with the whole game** (`attemptHistory.game`), so the exact question can be asked again.
- `GET /api/progress/drill` returns the mistakes that have **not** been answered correctly since — a mistake is cleared once you get the same question right.
- The Review page → Mistakes tab → **Drill my mistakes** opens `#/play/drill`, which replays them and saves the results against the lesson each question came from (so XP and the notebook stay correct).

## 16. Voice mode
- Settings → Accessibility → **Voice mode**. The question is read out loud and you can answer by talking.
- `utils/voice.js` wraps the browser's Web Speech API: `speak()`, `listen()` and `matchSpoken()` (which works out which option you said). No audio leaves the device.
- In `RoundView.jsx` the microphone matches a spoken option, a spoken "true"/"false", or fills the text box.

## 17. Generated diagrams
- The lesson page → **Add diagram** (on a concept) draws a labelled diagram and adds the two games that use it.
- `services/diagramService.js` asks the text model for 4 parts, then for an SVG. The model is told to put part 1-4 in the four corners of a 0-100 space, so we know exactly where each part is and can build the click boxes ourselves.
- The SVG is stored on the game (`game.svg`) and shown as an inline image, so no upload is needed. `DIAGRAM_HOTSPOT` asks for one part, `MULTI_LABEL` for a group of two.

## 18. The help board
- In any game there is a **Stuck?** button. It posts the question to the global board, where any learner can answer it.
- The server reads the question **and the correct answer** from the lesson itself (`lessonId` + `conceptIndex` + `gameIndex`), so the client cannot tamper with either. Helpers never receive the correct answer — they just write what they think and the server compares it.
- The asker gets the answer back **inside the game**: the round polls the board every 5 seconds and offers "Use this answer".
- Rules that keep it fair: a question that was answered by somebody else earns **no XP**, and the helper earns **+20 XP** (`HELP_ANSWER_XP`).
- Routes: `GET /api/help` (the board), `POST /api/help` (ask), `POST /api/help/:id/answer`, `POST /api/help/:id/accept`, `GET /api/help/mine`, `DELETE /api/help/:id` (remove it for good).
- Removing a question: the **asker** can always remove their own, and a **teacher** can remove any of them. The attached pictures are deleted with it (both the Cloudinary copy and the local one).

## 19. Pictures
- `services/imageStorage.js` decides where an uploaded picture goes: **Cloudinary** when `CLOUDINARY_CLOUD_NAME` is set, otherwise it is kept on our own server in `prism-backend/uploads/` and served from `/uploads`.
- Two things that look fine but are not:
  - The URL must be **absolute** (`http://host/uploads/x.png`), otherwise the browser asks the wrong server for it. `absoluteUrl()` builds it from the request.
  - The picture is on a **different origin** than the website (`:8080` vs `:5173`), so the browser needs permission to load it. Helmet's default `Cross-Origin-Resource-Policy: same-origin` blocks it — the image returns 200 but never appears. `server.js` sets `cross-origin`.

## 20. Groups and invitations
"Add the people you work with" — and they get to say yes or no.

- **Study groups** (`models/StudyGroup.js`): a name, a subject, a description, members and the lessons everybody in the group can practise.
- **Invitations** (`models/Invitation.js`): one invitation = one person + one thing. Three kinds:
  - `group` — accepting adds them to the group,
  - `lesson` — accepting copies the lesson into their own library (so they earn their own XP),
  - `class` — accepting puts them in the teacher's class.
- **Nothing happens until the invitation is accepted.** Declining simply marks it declined.
- The **bell** in the top bar (`components/InviteBell.jsx`) shows how many are waiting and lets you accept or decline without leaving the page.
- Where to invite from: a group (Groups page), a lesson (lesson page → *Invite someone*), or a classroom (teacher page → *Invite a student*).
- Routes: `/api/groups` (make, list, open, invite, share a lesson, leave, remove a member, delete) and `/api/invites` (inbox, sent, send, respond).

## 21. The group chat and "study together"
- Each group has its **own page** — `#/app/groups/<id>` (`pages/GroupPage.jsx`), not a modal. A chat needs room, and a modal was far too small for it.
- The page has three tabs: **Members** (who is in it, shared lessons, invite/leave/remove), **Chat**, and **Study together**.
- **Chat** (`models/GroupMessage.js`): messages inside a group, plus system notes ("Lin joined the group"). The page polls every 3 seconds for anything new.
- **Study together** (`models/GroupRoom.js`): everybody in the group answers the **same** rounds at the same time, and a live leaderboard shows who is ahead. The questions come from the lessons the group shares — so a group needs one shared lesson before it can play.
- A round moves on once everybody has answered it. The room cleans itself up after two hours.
- **One gotcha worth remembering:** the invitation panel is portalled to `<body>`, so it is *not* inside the bell. A "click outside to close" handler that only checks the bell closes the panel the moment you reach for the Accept button — and the request is never sent. `InviteBell.jsx` checks both the bell and the panel.

## 15. Teacher mode
**How to become a teacher** — three ways, all the same thing:
1. When you create an account, tick **“I am a teacher”**.
2. Already have an account? **Settings → Teaching → Teacher mode** (it switches straight away).
3. From code: `PATCH /api/auth/role` with `{ "role": "teacher" }`.

The role lives on the user document. `middleware/authMiddleware.js` reads it fresh
from the database on every request, so a role change works immediately — no
re-login needed.

**How teacher mode works**
1. The teacher opens **Classroom** and creates a class code (e.g. `RKWB-QYQP`).
2. Students enter that code on their own Classroom tab to join.
3. The teacher picks a lesson and clicks **Assign** — it appears in the student's
   “Your work” list.
4. When a student opens it, the lesson is copied into their own library
   (`POST /api/lessons/copy-assigned`) so they can play it and earn their own XP.
5. The teacher sees each student's XP, accuracy and weak concepts.
