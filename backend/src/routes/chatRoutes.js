const { Router } = require('express');
const { askChatQuestion, getHistory, getModels } = require('../controllers/chatController');

const router = Router();

router.post('/ask', askChatQuestion);
router.get('/history', getHistory);
router.get('/models', getModels);

module.exports = router;
