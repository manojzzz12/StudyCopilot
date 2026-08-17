const axios = require("axios");

const groq = require("./aiService");
const { retrieveRelevantChunks } = require("./retrievalService");

const {
  addMessage,
  getHistory,
} = require("../data/chatHistory");

const EMBEDDING_API = "http://127.0.0.1:8000/embed";

async function chatWithDocument(question, document) {
  console.log("\n==============================");
  console.log("💬 New Chat Request");
  console.log("==============================");

  // Generate question embedding
  console.log("Generating question embedding...");

  const response = await axios.post(EMBEDDING_API, {
    text: question,
  });

  const questionEmbedding = response.data.embedding;

  console.log("Question Embedding Length:", questionEmbedding.length);

  // Semantic Retrieval
  const relevantChunks = retrieveRelevantChunks(
    questionEmbedding,
    document.embeddings
  );

  const context = relevantChunks
    .map((chunk) => (typeof chunk === "string" ? chunk : chunk.text))
    .join("\n\n");

  // Store user's message
  addMessage("user", question);

  // Get previous conversation
  const history = getHistory();

  const messages = [
    {
      role: "system",
      content: `You are StudyCopilot, an AI study assistant.

Use ONLY the provided study material.

Rules:
- Give clear and concise answers.
- If the answer requires explanation, use short paragraphs or bullet points.
- Avoid repeating information.
- Do not invent facts that are not present in the study material.
- If the answer is not found in the study material, reply exactly:
  "I could not find the answer in the uploaded document."

Study Material:

${context}`,
    },

    ...history,
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      temperature: 0.2,
    });

    const answer = completion.choices[0].message.content;

    // Store AI response
    addMessage("assistant", answer);

    return answer;
  } catch (error) {
    console.error("Groq Error:", error);

    return "Sorry, I couldn't generate a response right now.";
  }
}

module.exports = {
  chatWithDocument,
};