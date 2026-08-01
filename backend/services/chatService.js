const groq = require("./aiService");
const { retrieveRelevantChunks } = require("./retrievalService");

const {
  addMessage,
  getHistory,
} = require("../data/chatHistory");

async function chatWithDocument(question, chunks) {
  // Retrieve relevant chunks
  const relevantChunks = retrieveRelevantChunks(question, chunks);

  const context = relevantChunks.join("\n\n");

  // Store user's message
  addMessage("user", question);

  // Get previous conversation
  const history = getHistory();

  // Build messages for Groq
  const messages = [
    {
      role: "system",
      content: `
You are StudyCopilot.

Answer ONLY using the study material below.

If the answer is not found in the study material, reply:

"I could not find the answer in the uploaded document."

Study Material:

${context}
      `,
    },

    ...history,
  ];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
  });

  const answer = completion.choices[0].message.content;

  // Store AI response
  addMessage("assistant", answer);

  return answer;
}

module.exports = {
  chatWithDocument,
};