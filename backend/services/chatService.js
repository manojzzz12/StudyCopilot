const axios = require("axios");

const groq = require("./aiService");
const { retrieveRelevantChunks } = require("./retrievalService");

const EMBEDDING_API = process.env.EMBEDDING_API_URL;

async function chatWithDocument(question, document, history = []) {
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

  const sources = relevantChunks.map((chunk, index) => {
    const text = typeof chunk === "string" ? chunk : chunk.text;
    const preview = text.replace(/\s+/g, " ").trim();

    return {
      chunk: typeof chunk === "string" ? index + 1 : chunk.chunk,
      score: typeof chunk === "string" ? 0 : chunk.score,
      preview: preview.slice(0, 120),
    };
  });

  const conversationHistory = Array.isArray(history)
    ? history.filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
      )
    : [];

  const messages = [
    {
      role: "system",
      content: `You are StudyCopilot, an AI study assistant.

Rules:
- Prioritize the uploaded document and the retrieved document context.
- Use the previous conversation to understand follow-up questions such as "Explain more", "Give an example", or "Continue".
- Do not invent information that is not supported by the retrieved document context.
- Give clear, concise answers; use short paragraphs or bullet points when helpful.
- If the answer is not supported by the retrieved document context, reply exactly:
  "I could not find the answer in the uploaded document."`,
    },
    ...conversationHistory,
    {
      role: "user",
      content: `Retrieved document context:\n\n${context}\n\nCurrent question:\n${question}`,
    },
  ];

  try {
    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      temperature: 0.2,
    });

    const answer = completion.choices[0].message.content;

    return { answer, sources };
  } catch (error) {
    console.error("Groq Error:", error);

    return {
      answer: "Sorry, I couldn't generate a response right now.",
      sources,
    };
  }
}

module.exports = {
  chatWithDocument,
};
