const asyncHandler = require('../utils/asyncHandler');
const { askQuestion, getChatHistory } = require('../services/chatService');

const askChatQuestion = asyncHandler(async (req, res) => {
  const result = await askQuestion(req.body);

  res.json(result);
});

const getHistory = asyncHandler(async (req, res) => {
  const chats = await getChatHistory();

  res.json({
    chats
  });
});

module.exports = {
  askChatQuestion,
  getHistory
};

