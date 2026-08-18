const { cosineSimilarity } = require("./similarityService");

function retrieveRelevantChunks(questionEmbedding, embeddings) {
  if (!embeddings || embeddings.length === 0) {
    console.log("❌ No embeddings found.");
    return [];
  }

  const scoredChunks = embeddings.map((item, index) => {
    const questionLength = questionEmbedding?.length || 0;
    const storedLength = item.embedding?.length || 0;

    console.log(
      `Chunk ${index + 1}: Question=${questionLength}, Stored=${storedLength}`
    );

    const score = cosineSimilarity(
      questionEmbedding,
      item.embedding || []
    );

    return {
      chunk: index + 1,
      text: item.text,
      score,
    };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  console.log("\n===== Top Matching Chunks =====");

  scoredChunks.slice(0, 3).forEach((chunk, index) => {
    console.log(
      `${index + 1}. Score: ${chunk.score.toFixed(4)}`
    );
  });

  console.log("===============================\n");

  return scoredChunks.slice(0, 3);
}

module.exports = {
  retrieveRelevantChunks,
};
