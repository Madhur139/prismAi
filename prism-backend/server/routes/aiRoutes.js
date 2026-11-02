const express = require('express');
const rateLimit = require('express-rate-limit');
const protect = require('../middleware/authMiddleware');
const { searchAI } = require('../controllers/aiController');
const { makeQuestion, checkAnswer, explainAnswer, autopsyAnswer } = require('../controllers/answerController');
const { summarize, explainLevels } = require('../controllers/insightController');

const router = express.Router();
// AI calls cost quota, so keep a per-IP limit (20 per minute) on the learning endpoints
const learnLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: 'Too many requests, slow down a little.' } });

router.use(protect);
router.post('/search', searchAI);
router.post('/question', learnLimiter, makeQuestion);   // body: { lessonId?, topic?, conceptName?, difficulty?, avoid? }
router.post('/check', learnLimiter, checkAnswer);       // body: { question, answer, lessonId?, conceptName?, topic? }
router.post('/explain', learnLimiter, explainAnswer);   // body: { question, correctAnswer, userAnswer?, topic?, explanation? }
router.post('/autopsy', learnLimiter, autopsyAnswer);    // body: { question, correctAnswer, userAnswer, topic?, explanation? }
router.post('/summary', learnLimiter, summarize);       // body: { lessonId, conceptName? } -> spoken summary script
router.post('/levels', learnLimiter, explainLevels);    // body: { lessonId?, conceptName, topic? } -> 3 depths
module.exports = router;
