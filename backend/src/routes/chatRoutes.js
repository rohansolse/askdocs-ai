const { Router } = require('express');
const { askChatQuestion, getHistory } = require('../controllers/chatController');

const router = Router();

router.post('/ask', askChatQuestion);
router.get('/history', getHistory);

module.exports = router;

