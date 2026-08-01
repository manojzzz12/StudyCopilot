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

  // If the question contains only stop words,
  // use the entire question.
  if (keywords.length === 0) {
    return chunks.slice(0, 3);
  }

  const scoredChunks = chunks.map((chunk) => {
    const text = chunk.toLowerCase();

    let score = 0;

    keywords.forEach((keyword) => {

      // Exact match
      if (text.includes(keyword)) {
        score += 5;
      }

      // Partial match
      text.split(/\s+/).forEach((word) => {
        if (
          word.startsWith(keyword) ||
          keyword.startsWith(word)
        ) {
          score += 2;
        }
      });

    });

    return {
      chunk,
      score,
    };
  });

  scoredChunks.sort((a, b) => b.score - a.score);

  const best = scoredChunks.filter((c) => c.score > 0);

  if (best.length === 0) {
    // Fallback:
    // Send first few chunks instead of nothing.
    return chunks.slice(0, 3);
  }

  return best.slice(0, 3).map((c) => c.chunk);
}

module.exports = {
  retrieveRelevantChunks,
};