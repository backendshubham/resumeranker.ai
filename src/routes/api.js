const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/get-resume-score', aiController.getResumeScore);
router.post('/get-resume-score-ai', aiController.getResumeScoreAi);

module.exports = router;
