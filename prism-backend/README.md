# Prism AI — Backend

## Folder structure

```text
backend/
├── server.js                  # entry point: app setup + start
├── config/
│   ├── env.js                 # reads .env in one place
│   ├── db.js                  # MongoDB connection
│   ├── cloudinary.js          # Cloudinary login
│   ├── gemini.js              # Gemini client
│   └── constants.js           # GAME_TYPES, XP_TABLE, retries
├── models/
│   ├── User.js
│   ├── Lesson.js              # Lesson -> Concepts -> Games
│   └── UserProgress.js
├── controllers/               # logic of each endpoint
│   ├── authController.js
│   ├── lessonController.js
│   └── progressController.js
├── routes/                    # URL -> controller
│   ├── authRoutes.js
│   ├── lessonRoutes.js
│   └── progressRoutes.js
├── middleware/
│   ├── authMiddleware.js      # login check (JWT)
│   ├── uploadMiddleware.js    # Multer image upload
│   ├── rateLimiters.js        # AI rate limit
│   ├── asyncHandler.js        # catches async errors
│   └── errorHandler.js        # central error responses
├── services/                  # outside services
│   ├── geminiService.js       # AI prompts + calls
│   ├── cloudinaryService.js   # upload / delete images
│   └── lessonRepairService.js # validate + retry bad games
└── utils/
    ├── validateGame.js        # anti-hallucination checks
    └── helpers.js             # token, id check, dates
```

## How a request flows

```text
Request -> server.js -> routes/ -> middleware/ -> controllers/ -> models/ + services/ -> Response
```

## Run

```bash
npm install
cp .env.example .env   # then fill in your keys
npm run dev
```

## Endpoints

| Method | URL | Login? |
|---|---|---|
| POST | /api/auth/register | no |
| POST | /api/auth/login | no |
| POST | /api/lessons/generate | yes |
| GET | /api/lessons | yes |
| GET | /api/lessons/:id | yes |
| GET | /api/lessons/:id/session | yes |
| POST | /api/lessons/:id/regenerate | yes |
| DELETE | /api/lessons/:id | yes |
| POST | /api/progress/submit | yes |
| GET | /api/progress/me | yes |
| GET | /api/health | no |
