const chatHistory = [];

function addMessage(role, content) {
  chatHistory.push({
    role,
    content,
  });

  // Keep only the last 10 messages
  if (chatHistory.length > 10) {
    chatHistory.shift();
  }
}

function getHistory() {
  return chatHistory;
}

function clearHistory() {
  chatHistory.length = 0;
}

module.exports = {
  addMessage,
  getHistory,
  clearHistory,
};