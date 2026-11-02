# Prism AI — Feature Roadmap

This document tracks every feature across all sections, what has been **implemented**, what is **planned**, and how to build it.

---

## Section 1 — Core Learning Experience

| Idea | Status | Notes |
|------|--------|-------|
| Lesson templates | ⬜ Planned | Save a lesson's structure as a template |
| Concept prerequisites | ⬜ Planned | Block unlock until prerequisite mastery |
| Practice timer / Pomodoro | ✅ Done | `src/components/PomodoroTimer.jsx` — 25 min focus + 5 min break |
| Flashcard mode | ✅ Done | `src/pages/FlashcardsPage.jsx` — lesson-based + manual cards |
| Note-taking sidebar | ⬜ Planned | Per-lesson notepad saved to localStorage |

---

## Section 2 — AI Features (Gemini)

| Idea | Status | Notes |
|------|--------|-------|
| "Explain like I'm 5" toggle | ✅ Done | Settings + backend `answerController.js` (`explainLike5` flag) |
| AI tutor chat in-game | ⬜ Planned | Floating hint bubble in `RoundView.jsx` |
| Wrong-answer autopsy | ✅ Done | `POST /api/ai/autopsy` + `AutopsyCard.jsx` inline after wrong answers |
| Voice-to-text answers | ⬜ Partial | `src/utils/voice.js` exists; wire into more game inputs |
| Lesson from URL/text | ⬜ Planned | Extend `POST /api/lessons/import` to accept webpage URLs |

---

## Section 3 — Games & Arcade

| Idea | Status | Notes |
|------|--------|-------|
| Daily challenge | ✅ Done | `src/components/DailyChallenge.jsx` on dashboard |
| Speedrun mode | ⬜ Planned | Timer overlay; best times saved per user/lesson |
| Custom question bank | ✅ Done | `POST /api/lessons/:id/custom-game` + `CustomGameEditor.jsx` |
| Boss battles | ⬜ Planned | Harder final game per lesson; bonus XP |
| Retry wrong-only | ⬜ Partial | `GET /api/progress/drill` exists on Review page |

---

## Section 4 — Social & Collaboration

| Idea | Status | Notes |
|------|--------|-------|
| Study rooms (live) | ✅ Done | Already existed — `StudyTogether.jsx` + `GroupPage.jsx` + `GroupRoom` model |
| Lesson sharing with remix | ⬜ Planned | "Fork" a shared lesson into your library |
| Study groups with goals | ⬜ Planned | Group XP goal + group leaderboard |
| Peer review | ⬜ Planned | Students submit answers; group upvotes best |
| Teacher announcements | ⬜ Planned | Broadcast to class from dashboard |

---

## Section 5 — Teacher / Classroom Tools

| Idea | Status | Notes |
|------|--------|-------|
| Assignment due dates | ⬜ Planned | `dueAt` on assignments; "Due" badge on student dashboard |
| Auto-grading report | ⬜ Planned | Teacher view: class average, hardest question |
| Class code QR | ⬜ Planned | QR code for class code; students scan to join |
| Parent/guardian view | ⬜ Planned | Read-only weekly progress email |

---

## Section 6 — Gamification & Retention

| Idea | Status | Notes |
|------|--------|-------|
| Badges & achievements | ✅ Done | 12 badges in `src/utils/achievements.js` + `AchievementsPage.jsx` |
| XP store | ⬜ Planned | Spend XP on avatar frames/themes (cosmetic) |
| Streak freeze | ⬜ Planned | One free missed day; earnable with XP |
| Seasonal events | ⬜ Planned | Holiday game skins + bonus XP weekends |

---

## Section 7 — Accessibility & PWA

| Idea | Status | Notes |
|------|--------|-------|
| Offline lessons | ⬜ Partial | `public/sw.js` + `public/manifest.webmanifest` (app shell) |
| Dark mode per subject | ✅ Done | Settings → Subject theme (auto/math/science/language/history) |
| Read-aloud lesson | ⬜ Partial | `src/utils/voice.js` (`speak()`) |
| Dyslexia font | ✅ Done | `dyslexiaFont` setting → `data-font="dyslexia"` |

---

## Files changed in latest pass

### Added
- `frontend/src/pages/FlashcardsPage.jsx` — `#/app/flashcards`
- `frontend/src/pages/AchievementsPage.jsx` — `#/app/achievements`
- `frontend/src/components/ManualFlashcardCreator.jsx` — create your own flashcards
- `frontend/src/components/AutopsyCard.jsx` — wrong-answer autopsy UI
- `frontend/src/components/PomodoroTimer.jsx` — focus timer
- `frontend/src/components/DailyChallenge.jsx` — daily question card
- `frontend/src/components/CustomGameEditor.jsx` — write your own lesson questions
- `frontend/src/components/AchievementBadge.jsx` — badge display chip
- `frontend/src/utils/achievements.js` — badge definitions + checking
- `frontend/src/utils/stats.js` — badge-relevant stats store
- `frontend/src/utils/manualFlashcards.js` — manual flashcard storage
- `FEATURES_ROADMAP.md` — this file
- `README.md` — updated with all features

### Modified
- `frontend/src/layout/Workspace.jsx` — Flashcards & Achievements nav items
- `frontend/src/pages/SettingsPage.jsx` — subject theme + ELI5 toggle
- `frontend/src/pages/DashboardPage.jsx` — Daily Challenge section
- `frontend/src/pages/LessonPage.jsx` — "Add my question" button
- `frontend/src/pages/PlayPage.jsx` — stat tracking for badges
- `frontend/src/games/RoundView.jsx` — autopsy button after wrong answers
- `frontend/src/styles/app.css` — badge, flashcard, pomodoro, subject-theme CSS
- `prism-backend/server/controllers/answerController.js` — `explainLike5` + `autopsyAnswer`
- `prism-backend/server/controllers/lessonController.js` — `addCustomGame`
- `prism-backend/server/routes/aiRoutes.js` — `/api/ai/autopsy`
- `prism-backend/server/routes/lessonRoutes.js` — `/api/lessons/:id/custom-game`

### Removed
- CodeLab (frontend page + backend routes/controllers/model + CSS)

---

## Build verification

- Frontend: `vite build` ✅ (135 modules, no warnings)
- Backend: `node --check` on all files ✅ (zero syntax errors)
