const STOP_WORDS = [
  "what",
  "is",
  "are",
  "the",
  "a",
  "an",
  "of",
  "to",
  "in",
  "for",
  "on",
  "and",
  "or",
  "how",
  "why",
  "when",
  "where",
  "who",
  "which",
  "explain",
  "describe",
  "tell",
  "about",
  "define",
  "give",
];

function retrieveRelevantChunks(question, chunks) {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const keywords = question
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 2 &&
        !STOP_WORDS.includes(word)
    );

  const scoredChunks = chunks.map((chunk) => {
    const chunkText = chunk.toLowerCase();

    let score = 0;

    keywords.forEach((keyword) => {
      const matches = chunkText.match(
        new RegExp(keyword, "g")
      );

      if (matches) {
        score += matches.length;
      }
    });

    return {
      chunk,
      score,
    };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks
    .filter((item) => item.score > 0)
    .slice(0, 3)
    .map((item) => item.chunk);
}

module.exports = {
  retrieveRelevantChunks,
};