const groq = require("./aiService");
const { retrieveRelevantChunks } = require("./retrievalService");

async function chatWithDocument(question, chunks) {
  // Find the most relevant chunks
  const relevantChunks = retrieveRelevantChunks(question, chunks);

  // Join them into one context
  const context = relevantChunks.join("\n\n");

  const prompt = `
You are StudyCopilot.

Answer ONLY using the study material below.

If the answer is not present in the study material, reply exactly:

"I could not find the answer in the uploaded document."

==============================
STUDY MATERIAL
==============================

${context}

==============================
QUESTION
==============================

${question}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return completion.choices[0].message.content;
}

module.exports = {
  chatWithDocument,
};